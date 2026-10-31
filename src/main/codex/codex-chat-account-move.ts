import { findTrustedCodexSessionResume } from './codex-session-resume-home'
import { prepareCodexAccountRestartResume } from './codex-legacy-session-resume'

/** A chat's Codex thread, made resumable from `targetHome` with the terminals' restart step.
 *  False when no rollout of the thread exists in either home. */
export async function carryCodexThreadToAccountHome(args: {
  threadId: string
  sourceHome: string
  targetHome: string
  systemCodexHomePath: string
}): Promise<boolean> {
  // The target ranks first, so a rollout history sharing already linked there is not copied twice.
  const found = await findTrustedCodexSessionResume({
    sessionId: args.threadId,
    transcriptPath: undefined,
    trustedCodexHomes: [args.targetHome, args.sourceHome],
    getSelectedAccountCodexHome: () => args.targetHome,
    systemCodexHomePath: null,
    sharedRuntimeCodexHomePath: null
  })
  if (!found) {
    return false
  }
  await prepareCodexAccountRestartResume({
    sourceHome: found.homePath,
    transcriptPath: found.transcriptPath,
    targetHome: args.targetHome,
    systemCodexHomePath: args.systemCodexHomePath
  })
  return true
}
