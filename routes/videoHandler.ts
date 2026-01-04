/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import fs from 'node:fs'
import pug from 'pug'
import config from 'config'
import { type Request, type Response } from 'express'

import * as challengeUtils from '../lib/challengeUtils'
import { themes } from '../views/themes/themes'
import { challenges } from '../data/datacache'
import * as utils from '../lib/utils'

export const getVideo = () => {
  return (req: Request, res: Response) => {
    const path = videoPath()
    const stat = fs.statSync(path)
    const fileSize = stat.size
    const range = req.headers.range

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = Number.parseInt(parts[0], 10)
      const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1

      const file = fs.createReadStream(path, { start, end })
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Location': '/assets/public/videos/owasp_promo.mp4',
        'Content-Type': 'video/mp4'
      })
      file.pipe(res)
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      })
      fs.createReadStream(path).pipe(res)
    }
  }
}

export const promotionVideo = () => {
  return (req: Request, res: Response) => {
    const subs = getSubsFromFile()

    // Challenge volontairement conservé
    challengeUtils.solveIf(
      challenges.videoXssChallenge,
      () => utils.contains(subs, '</script><script>alert(`xss`)</script>')
    )

    const themeKey = config.get<string>('application.theme') as keyof typeof themes
    const theme = themes[themeKey] || themes['bluegrey-lightgreen']

    const html = pug.renderFile('views/promotionVideo.pug', {
      title: config.get<string>('application.name'),
      favicon: utils.extractFilename(config.get('application.favicon')),
      theme,
      subtitles: subs // volontairement non échappé (challenge)
    })

    res.send(html)
  }
}

function getSubsFromFile () {
  const subtitles = config.get<string>('application.promotion.subtitles') ?? 'owasp_promo.vtt'
  return fs.readFileSync(
    `frontend/dist/frontend/assets/public/videos/${subtitles}`,
    'utf8'
  )
}

function videoPath () {
  if (config.get<string>('application.promotion.video') !== null) {
    const video = utils.extractFilename(config.get<string>('application.promotion.video'))
    return `frontend/dist/frontend/assets/public/videos/${video}`
  }
  return 'frontend/dist/frontend/assets/public/videos/owasp_promo.mp4'
}
