import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { link, lstat, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { errnoCodeOrUnknown } from '../shared/errno-code'
import {
  copySessionFileWithoutOverwrite,
  isAtomicNoReplaceUnsupportedError
} from './codex/codex-session-backfill-copy'

/** Make an agent's conversation file readable at `targetPath` too: a hardlink, else a copy.
 *  Never replaces a different file already there. */
export async function installConversationFileWithoutOverwrite(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  const sourceStat = await lstat(sourcePath)
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
    throw new Error('Legacy rollout source is not a regular file.')
  }
  await mkdir(dirname(targetPath), { recursive: true })
  try {
    await link(sourcePath, targetPath)
  } catch (linkError) {
    if (isExistsError(linkError)) {
      await assertMatchingExistingTarget(sourcePath, targetPath)
      return
    }
    try {
      await copySessionFileWithoutOverwrite(sourcePath, targetPath)
    } catch (copyError) {
      if (isExistsError(copyError)) {
        await assertMatchingExistingTarget(sourcePath, targetPath)
        return
      }
      if (isAtomicNoReplaceUnsupportedError(copyError)) {
        throw new Error('The target filesystem cannot safely install this rollout.', {
          cause: copyError
        })
      }
      throw copyError
    }
  }
}

async function assertMatchingExistingTarget(sourcePath: string, targetPath: string): Promise<void> {
  const [sourceStat, targetStat] = await Promise.all([lstat(sourcePath), lstat(targetPath)])
  if (
    !targetStat.isFile() ||
    targetStat.isSymbolicLink() ||
    sourceStat.size !== targetStat.size ||
    ((sourceStat.dev !== targetStat.dev || sourceStat.ino !== targetStat.ino) &&
      (await fileDigest(sourcePath)) !== (await fileDigest(targetPath)))
  ) {
    throw new Error('A different rollout already occupies the real-home target path.')
  }
}

async function fileDigest(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk)
  }
  return hash.digest('hex')
}

function isExistsError(error: unknown): boolean {
  return errnoCodeOrUnknown(error) === 'EEXIST'
}
