import { join } from 'node:path'
import { relativePathInsideRoot } from '../../shared/cross-platform-path'
import { installConversationFileWithoutOverwrite } from '../agent-conversation-file-install'
import { resolveSessionFilePath } from '../native-chat/session-file-resolver'

async function claudeTranscriptIn(sessionId: string, home: string): Promise<string | null> {
  return resolveSessionFilePath('claude', sessionId, {
    claudeProjectsDir: join(home, 'projects')
  })
}

/** A chat's Claude transcript, made resumable from `targetHome` at the same project path.
 *  Accounts that share history already have it; false when no known home holds it. */
export async function carryClaudeConversationToAccountHome(args: {
  sessionId: string
  /** Homes the conversation may have last run in, most likely first. */
  sourceHomes: readonly string[]
  targetHome: string
}): Promise<boolean> {
  if (await claudeTranscriptIn(args.sessionId, args.targetHome)) {
    return true
  }
  for (const home of args.sourceHomes) {
    const transcript = await claudeTranscriptIn(args.sessionId, home)
    const relative = transcript && relativePathInsideRoot(join(home, 'projects'), transcript)
    if (relative) {
      await installConversationFileWithoutOverwrite(
        transcript,
        join(args.targetHome, 'projects', relative)
      )
      return true
    }
  }
  return false
}
