import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { carryClaudeConversationToAccountHome } from './claude-chat-account-move'

const SESSION = '11111111-2222-4333-8444-555555555555'
const PROJECT = '-Users-dev-repo'

describe('carryClaudeConversationToAccountHome', () => {
  let root: string
  let homeA: string
  let homeB: string
  let homeC: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'orca-claude-chat-move-'))
    homeA = join(root, 'a')
    homeB = join(root, 'b')
    homeC = join(root, 'c')
    for (const home of [homeA, homeB, homeC]) {
      mkdirSync(join(home, 'projects'), { recursive: true })
    }
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const writeTranscript = (home: string, text = '{"type":"user"}\n') => {
    const path = join(home, 'projects', PROJECT, `${SESSION}.jsonl`)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, text)
    return path
  }
  const carry = (sourceHomes = [homeA, homeC]) =>
    carryClaudeConversationToAccountHome({ sessionId: SESSION, sourceHomes, targetHome: homeB })

  it('links the transcript into the selected account under the same project', async () => {
    const source = writeTranscript(homeA)
    expect(await carry()).toBe(true)
    const target = join(homeB, 'projects', PROJECT, `${SESSION}.jsonl`)
    expect(statSync(target).ino).toBe(statSync(source).ino)
  })

  it('finds a transcript in any account the chat may have run in', async () => {
    writeTranscript(homeC, 'from c\n')
    expect(await carry()).toBe(true)
    expect(readFileSync(join(homeB, 'projects', PROJECT, `${SESSION}.jsonl`), 'utf8')).toBe(
      'from c\n'
    )
  })

  it('needs nothing when the selected account already shares the history', async () => {
    writeTranscript(homeB, 'shared\n')
    expect(await carry()).toBe(true)
    expect(readFileSync(join(homeB, 'projects', PROJECT, `${SESSION}.jsonl`), 'utf8')).toBe(
      'shared\n'
    )
  })

  it('reports a conversation no known account holds', async () => {
    expect(await carry()).toBe(false)
  })
})
