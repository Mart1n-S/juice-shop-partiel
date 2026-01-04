/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import fs from 'node:fs'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { type Request, type Response, type NextFunction } from 'express'
import { URL } from 'node:url'

import * as security from '../lib/insecurity'
import { UserModel } from '../models/user'
import * as utils from '../lib/utils'
import logger from '../lib/logger'

const ALLOWED_PROTOCOLS = new Set(['https:'])
const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1'
])

export function profileImageUrlUpload () {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.body.imageUrl !== undefined) {
      let parsedUrl: URL

      try {
        parsedUrl = new URL(req.body.imageUrl)
      } catch {
        return res.status(400).json({ error: 'Invalid image URL' })
      }

      // SSRF protection
      if (
        !ALLOWED_PROTOCOLS.has(parsedUrl.protocol) ||
        BLOCKED_HOSTS.has(parsedUrl.hostname)
      ) {
        return res.status(400).json({ error: 'Image URL not allowed' })
      }

      // Juice Shop challenge detection preserved
      if (parsedUrl.pathname.includes('/solve/challenges/server-side')) {
        req.app.locals.abused_ssrf_bug = true
      }

      const loggedInUser = security.authenticatedUsers.get(req.cookies.token)
      if (!loggedInUser) {
        next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
        return
      }

      try {
        const response = await fetch(parsedUrl.toString())
        if (!response.ok || !response.body) {
          throw new Error('Image URL returned invalid response')
        }

        const ext = ['jpg', 'jpeg', 'png', 'svg', 'gif'].includes(
          parsedUrl.pathname.split('.').slice(-1)[0].toLowerCase()
        )
          ? parsedUrl.pathname.split('.').slice(-1)[0].toLowerCase()
          : 'jpg'

        const filePath = `frontend/dist/frontend/assets/public/images/uploads/${loggedInUser.data.id}.${ext}`
        const fileStream = fs.createWriteStream(filePath, { flags: 'w' })

        await finished(Readable.fromWeb(response.body as any).pipe(fileStream))

        await UserModel.findByPk(loggedInUser.data.id)
          .then(async (user) => await user?.update({
            profileImage: `/assets/public/images/uploads/${loggedInUser.data.id}.${ext}`
          }))
      } catch (error) {
        try {
          const user = await UserModel.findByPk(loggedInUser.data.id)
          await user?.update({ profileImage: parsedUrl.toString() })
          logger.warn(
            `Error retrieving user profile image: ${utils.getErrorMessage(error)}; using image link directly`
          )
        } catch (error) {
          next(error)
          return
        }
      }
    }

    res.redirect(process.env.BASE_PATH + '/profile')
  }
}
