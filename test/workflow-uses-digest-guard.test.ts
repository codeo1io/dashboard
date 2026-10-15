import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'

// rm-1445 structural guard (digest form): every REMOTE `uses:` pin in the
// GitHub workflow tree — workflows AND composite actions — must reference a
// full 40-hex commit digest, never a moving tag or branch name. A tag-named
// pin is invisible to drift reads: the 2026-10-10 rider on rm-196 read tag
// NAMES, concluded 'pnpm/action-setup v6.1.0 all current', while the tree
// actually pinned digest 0977fd99 = v6.0.10 at two workflow sites plus the
// composite action. Digest form is the floor that makes drift detectable at
// all — with every remote pin a sha, a digest-vs-tag resolve is always
// possible and a tag read can never masquerade as pin truth again.
//
// Local composite actions (`./...`) and `docker://` refs are exempt: they do
// not float on an external repo. Trailing `# vX.Y.Z` comments are the repo's
// pin-provenance convention (see base-drift.yaml) and are stripped before
// the ref is checked.
const GITHUB_DIR = join(import.meta.dirname, '..', '.github')

interface UsesPin {
  location: string
  line: number
  ref: string
}

function listYamlFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...listYamlFiles(full))
    else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) files.push(full)
  }
  return files
}

function scanRemoteUses(location: string, source: string): UsesPin[] {
  const pins: UsesPin[] = []
  const lines = source.split('\n')
  for (const [i, rawLine] of lines.entries()) {
    const usesMatch = /^-?\s*uses:\s*(\S+)(?:\s+#.*)?$/.exec(rawLine.trim())
    if (!usesMatch) continue
    const ref = usesMatch[1] ?? ''
    if (ref.startsWith('./') || ref.startsWith('docker://')) continue
    pins.push({location, line: i + 1, ref})
  }
  return pins
}

const SHA256_PREFIX = /^[0-9a-f]{40}$/

function isDigestPinned(ref: string): boolean {
  // `owner/repo@ref` (GitHub requires the @ separator for remote actions);
  // multi-segment paths like github/codeql-action/init@<sha> are included.
  const at = ref.lastIndexOf('@')
  if (at <= 0) return false
  return SHA256_PREFIX.test(ref.slice(at + 1)) && ref.slice(0, at).includes('/')
}

describe('workflow uses: digest-form guard (rm-1445)', () => {
  it('every remote uses: pin in workflows and composite actions is a 40-hex digest', () => {
    const yamlFiles = listYamlFiles(GITHUB_DIR)
    // 11 workflows + the setup composite action + dependabot.yml at the time
    // of writing; a silent walk regression would otherwise pass vacuously.
    expect(yamlFiles.length).toBeGreaterThanOrEqual(13)

    const allPins = yamlFiles.flatMap(file =>
      scanRemoteUses(file.replace(`${GITHUB_DIR}/`, ''), readFileSync(file, 'utf8')),
    )

    // The scan must see the real remote pin population — 44 pins when
    // written, including the 2 inside the setup composite action, which
    // base-drift.yaml's own census scans and a workflows-only guard would
    // miss (that undercount is exactly how the v6.0.10 pin survived the
    // 2026-10-10 'all current' tag read).
    expect(allPins.length).toBeGreaterThanOrEqual(40)

    const unpinned = allPins.filter(pin => !isDigestPinned(pin.ref))
    expect(
      unpinned.map(pin => `${pin.location}:${pin.line} -> ${pin.ref}`),
      'remote uses: pins not pinned to a 40-hex commit digest',
    ).toEqual([])
  })
})
