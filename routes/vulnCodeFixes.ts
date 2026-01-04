import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { type NextFunction, type Request, type Response } from 'express'

import * as accuracy from '../lib/accuracy'
import * as challengeUtils from '../lib/challengeUtils'
import { type ChallengeKey } from 'models/challenge'

const FIXES_DIR = path.resolve('./data/static/codefixes')

interface CodeFix {
  fixes: string[]
  correct: number
}

type Cache = Record<string, CodeFix>

const CodeFixes: Cache = {}

export const readFixes = (key: string) => {
  if (CodeFixes[key]) {
    return CodeFixes[key]
  }

  const files = fs.readdirSync(FIXES_DIR)
  const fixes: string[] = []
  let correct = -1

  for (const file of files) {
    if (file.startsWith(`${key}_`)) {
      const filePath = path.resolve(FIXES_DIR, file)

      // Sécurité : s'assurer que le fichier reste dans FIXES_DIR
      if (!filePath.startsWith(FIXES_DIR + path.sep)) {
        continue
      }

      const fix = fs.readFileSync(filePath, 'utf8')
      const metadata = file.split('_')
      const number = metadata[1]

      fixes.push(fix)

      if (metadata.length === 3) {
        correct = parseInt(number, 10) - 1
      }
    }
  }

  CodeFixes[key] = {
    fixes,
    correct
  }

  return CodeFixes[key]
}

interface FixesRequestParams {
  key: string
}

interface VerdictRequestBody {
  key: ChallengeKey
  selectedFix: number
}

export const serveCodeFixes = () => (
  req: Request<FixesRequestParams, Record<string, unknown>, Record<string, unknown>>,
  res: Response,
  next: NextFunction
) => {
  const key = req.params.key
  const fixData = readFixes(key)

  if (fixData.fixes.length === 0) {
    res.status(404).json({
      error: 'No fixes found for the snippet!'
    })
    return
  }

  res.status(200).json({
    fixes: fixData.fixes
  })
}

export const checkCorrectFix = () => async (
  req: Request<Record<string, unknown>, Record<string, unknown>, VerdictRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const key = req.body.key
  const selectedFix = req.body.selectedFix
  const fixData = readFixes(key)

  if (fixData.fixes.length === 0) {
    res.status(404).json({
      error: 'No fixes found for the snippet!'
    })
    return
  }

  let explanation

  // Sécurisation du chemin du fichier info.yml
  const infoFilePath = path.resolve(FIXES_DIR, `${key}.info.yml`)

  if (!infoFilePath.startsWith(FIXES_DIR + path.sep)) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid code challenge key'
    })
  }

  if (fs.existsSync(infoFilePath)) {
    const codingChallengeInfos = yaml.load(
      fs.readFileSync(infoFilePath, 'utf8')
    )

    const selectedFixInfo = codingChallengeInfos?.fixes?.find(
      ({ id }: { id: number }) => id === selectedFix + 1
    )

    if (selectedFixInfo?.explanation) {
      explanation = res.__(selectedFixInfo.explanation)
    }
  }

  if (selectedFix === fixData.correct) {
    await challengeUtils.solveFixIt(key)
    res.status(200).json({
      verdict: true,
      explanation
    })
  } else {
    accuracy.storeFixItVerdict(key, false)
    res.status(200).json({
      verdict: false,
      explanation
    })
  }
}
