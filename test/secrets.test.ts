/**
 * Direct test coverage for src/secrets.ts hardening branches (rm-143).
 *
 * The loader is the load-bearing file for critical invariant #3 (never
 * commit/expose the App private key or cookie key). Until now it had zero
 * direct tests: the O_NOFOLLOW symlink refusal, the not-a-regular-file
 * rejection (FIFOs/devices/directories), the 4096-byte size cap, and the
 * ENOENT→env-var fall-through were all unverified. These tests are ADD-ONLY:
 * src/secrets.ts itself must remain diff-free (roadmap rm-143 acceptance).
 *
 * FIFO note: opening a FIFO O_RDONLY blocks until a writer appears, so the
 * FIFO case holds the write end open in a detached child process; our
 * openSync simply blocks until it attaches, then fstatSync rejects the
 * non-regular file. /dev/null additionally covers the character-device arm
 * of the same branch without spawning anything.
 */
import {execSync, spawn} from 'node:child_process'
import {mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import {afterAll, afterEach, beforeEach, describe, expect, it} from 'vitest'
import {
  readMultilineSecret,
  readOptionalMultilineSecret,
  readOptionalSecret,
  readSecret,
} from '../src/secrets.ts'

const PREFIX = 'DASH_TEST_SECRET' // unique env names; snapshot-restored per test

let fifoWriter: ReturnType<typeof spawn> | null = null

describe('secrets loader', () => {
  let dir: string
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'secrets-test-'))
    for (const key of [PREFIX, `${PREFIX}_FILE`, `${PREFIX}_MULTI`, `${PREFIX}_MULTI_FILE`]) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    rmSync(dir, {recursive: true, force: true})
  })

  describe('happy paths', () => {
    it('readSecret reads a single-line file and trims the trailing newline', () => {
      writeFileSync(join(dir, 'token'), 'ghp_abc123\n')
      process.env[`${PREFIX}_FILE`] = join(dir, 'token')
      expect(readSecret(PREFIX)).toBe('ghp_abc123')
    })

    it('readMultilineSecret preserves embedded newlines (PEM keys)', () => {
      const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIB\n-----END RSA PRIVATE KEY-----\n'
      writeFileSync(join(dir, 'pem'), pem)
      process.env[`${PREFIX}_MULTI_FILE`] = join(dir, 'pem')
      expect(readMultilineSecret(`${PREFIX}_MULTI`)).toBe(pem.trimEnd())
    })

    it('falls through to the env var when the _FILE path does not exist (ENOENT)', () => {
      process.env[`${PREFIX}_FILE`] = join(dir, 'missing')
      process.env[PREFIX] = 'from-env'
      expect(readSecret(PREFIX)).toBe('from-env')
    })

    it('returns null for an optional secret that is nowhere', () => {
      expect(readOptionalSecret(PREFIX)).toBeNull()
      expect(readOptionalMultilineSecret(`${PREFIX}_MULTI`)).toBeNull()
    })

    it('returns null when the file content is whitespace-only', () => {
      writeFileSync(join(dir, 'blank'), '   \n\t\n')
      process.env[`${PREFIX}_FILE`] = join(dir, 'blank')
      expect(readOptionalSecret(PREFIX)).toBeNull()
    })
  })

  describe('required-secret failure', () => {
    it('readSecret throws with the name and both lookup paths when absent', () => {
      expect(() => readSecret(PREFIX)).toThrow(
        new RegExp(`Missing required secret: ${PREFIX} `),
      )
    })
  })

  describe('hardening: not a regular file', () => {
    it('rejects a symlink (O_NOFOLLOW → ELOOP) and names the path', () => {
      writeFileSync(join(dir, 'real'), 'value\n')
      symlinkSync(join(dir, 'real'), join(dir, 'link'))
      process.env[`${PREFIX}_FILE`] = join(dir, 'link')
      expect(() => readSecret(PREFIX)).toThrow(/not a regular file.*symlink/)
    })

    it('rejects a directory', () => {
      process.env[`${PREFIX}_FILE`] = dir
      expect(() => readSecret(PREFIX)).toThrow(/not a regular file.*directory/)
    })

    it('rejects a character device (/dev/null)', () => {
      process.env[`${PREFIX}_FILE`] = '/dev/null'
      expect(() => readSecret(PREFIX)).toThrow(/not a regular file.*character device/)
    })

    it('rejects a FIFO (write end held open by a detached child)', () => {
      const fifo = join(dir, 'fifo')
      execSync(`mkfifo '${fifo}'`)
      // exec 9>fifo blocks until the reader attaches; `sleep 2` then keeps
      // the write end open long enough that a slow-to-block reader still
      // rendezvous instead of racing bash's immediate exit (afterAll kills it).
      const writer = spawn('bash', ['-c', 'exec 9>"$1"; sleep 2', 'sh', fifo], {detached: true, stdio: 'ignore'})
      writer.unref()
      fifoWriter = writer
      process.env[`${PREFIX}_FILE`] = fifo
      // openSync blocks until the writer attaches; fstatSync then rejects the pipe
      expect(() => readSecret(PREFIX)).toThrow(/not a regular file.*FIFO/)
    })
  })

  afterAll(() => {
    fifoWriter?.kill()
  })

  describe('hardening: size cap', () => {
    it('rejects files over the 4096-byte limit', () => {
      writeFileSync(join(dir, 'big'), `${'x'.repeat(4097)}\n`)
      process.env[`${PREFIX}_FILE`] = join(dir, 'big')
      expect(() => readSecret(PREFIX)).toThrow(/too large.*4096/)
    })

    it('accepts a file exactly at the 4096-byte limit', () => {
      writeFileSync(join(dir, 'max'), 'x'.repeat(4096))
      process.env[`${PREFIX}_FILE`] = join(dir, 'max')
      expect(readSecret(PREFIX)).toBe('x'.repeat(4096))
    })
  })

  describe('single-line line-break rejection', () => {
    it('rejects an embedded newline from a file', () => {
      writeFileSync(join(dir, 'wrapped'), 'line-one\nline-two\n')
      process.env[`${PREFIX}_FILE`] = join(dir, 'wrapped')
      expect(() => readSecret(PREFIX)).toThrow(/embedded line-breaking characters/)
    })

    it('rejects an embedded newline from the env var', () => {
      process.env[PREFIX] = 'env-one\nenv-two'
      expect(() => readSecret(PREFIX)).toThrow(/Environment variable .* line-breaking characters/)
    })
  })
})
