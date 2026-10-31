import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { carryCodexThreadToAccountHome } from './codex-chat-account-move'

const THREAD = '019a0000-0000-7000-8000-000000000001'
const ROLLOUT = join('2026', '10', '30', `rollout-2026-10-30T10-00-00-${THREAD}.jsonl`)

describe('carryCodexThreadToAccountHome', () => {
  let root: string
  let homeA: string
  let homeB: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'orca-codex-chat-move-'))
    // Keep the audit log away from the real profile.
    vi.stubEnv('ORCA_USER_DATA_PATH', join(root, 'user-data'))
    homeA = join(root, 'a')
    homeB = join(root, 'b')
    mkdirSync(join(homeB, 'sessions'), { recursive: true })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    rmSync(root, { recursive: true, force: true })
  })

  const writeRollout = (home: string, text = '{"type":"session_meta"}\n') => {
    const path = join(home, 'sessions', ROLLOUT)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, text)
    return path
  }
  const carry = () =>
    carryCodexThreadToAccountHome({
      threadId: THREAD,
      sourceHome: homeA,
      targetHome: homeB,
      systemCodexHomePath: join(root, 'system')
    })

  it('links the thread into the selected account at the same dated path', async () => {
    const source = writeRollout(homeA)
    expect(await carry()).toBe(true)
    const target = join(homeB, 'sessions', ROLLOUT)
    expect(readFileSync(target, 'utf8')).toBe('{"type":"session_meta"}\n')
    expect(statSync(target).ino).toBe(statSync(source).ino)
  })

  it('leaves a thread the selected account already shares', async () => {
    writeRollout(homeB, 'shared\n')
    expect(await carry()).toBe(true)
    expect(readFileSync(join(homeB, 'sessions', ROLLOUT), 'utf8')).toBe('shared\n')
  })

  it('reports a thread neither account holds', async () => {
    expect(await carry()).toBe(false)
  })
})
