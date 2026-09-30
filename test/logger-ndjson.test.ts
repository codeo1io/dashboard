import process from 'node:process'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {logger, readLogFormat} from '../src/logger'

const setEnv = (value: string | undefined): void => {
  if (value === undefined) {
    delete process.env.LOG_FORMAT
  } else {
    process.env.LOG_FORMAT = value
  }
}

interface LogSinkEntry {
  readonly level: string
  readonly message: string
  readonly context?: {readonly installationToken?: string; readonly repoCount?: number}
}

const parseEntry = (raw: unknown): LogSinkEntry => JSON.parse(String(raw)) as LogSinkEntry

afterEach(() => {
  setEnv(undefined)
  vi.restoreAllMocks()
})

describe('readLogFormat', () => {
  it('maps LOG_FORMAT=ndjson to the ndjson sink and everything else to human', () => {
    expect(readLogFormat({LOG_FORMAT: 'ndjson'})).toBe('ndjson')
    expect(readLogFormat({LOG_FORMAT: undefined})).toBe('human')
    // Strict, deliberate: near-misses do not silently enable the machine sink.
    expect(readLogFormat({LOG_FORMAT: 'json'})).toBe('human')
    expect(readLogFormat({LOG_FORMAT: 'NDJSON'})).toBe('human')
    expect(readLogFormat({LOG_FORMAT: 'ndjson '})).toBe('human')
    expect(readLogFormat({LOG_FORMAT: 'human'})).toBe('human')
  })

  it('defaults to human when the environment variable is unset', () => {
    setEnv(undefined)
    expect(readLogFormat()).toBe('human')
  })
})

describe('human mode (default)', () => {
  it('routes info and warning through console.warn, error through console.error, stdout untouched', () => {
    setEnv(undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    logger.info('cycle finished')
    logger.warning('partial data', {repoCount: 3})
    logger.error('refresh failed')

    expect(warn.mock.calls).toEqual([
      ['[info] cycle finished'],
      ['[warning] partial data {"repoCount":3}'],
    ])
    expect(error.mock.calls).toEqual([['[error] refresh failed']])
    expect(log).not.toHaveBeenCalled()
  })
})

describe('LOG_FORMAT=ndjson', () => {
  it('emits one JSON document per line on stdout and never touches console.warn/error', () => {
    setEnv('ndjson')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.info('cycle finished')
    const logged = log.mock.calls.map(args => JSON.parse(args[0] as string) as {level: string; message: string})
    expect(logged).toEqual([{level: 'info', message: 'cycle finished'}])
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('carries redacted context inside the JSON entry', () => {
    setEnv('ndjson')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    logger.warning('token rejected', {installationToken: 'ghs_secret', repoCount: 2})
    const line: unknown = log.mock.calls.at(-1)?.[0]
    expect(line).toBeDefined()
    const entry = parseEntry(line)

    expect(entry.level).toBe('warning')
    expect(entry.message).toBe('token rejected')
    expect(entry.context?.installationToken).toBe('[REDACTED]')
    expect(entry.context?.repoCount).toBe(2)
  })

  it('reads the format at emit time — toggling the variable mid-process switches sinks', () => {
    setEnv('ndjson')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logger.info('structured')
    setEnv(undefined)
    logger.info('human')

    expect(log).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls).toEqual([['[info] human']])
  })
})
