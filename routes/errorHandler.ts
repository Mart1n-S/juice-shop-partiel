/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'
import config from 'config'
import pug from 'pug'
import path from 'node:path'

import * as utils from '../lib/utils'

export function errorHandler () {
  return async (error: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error)
      return
    }

    if (req?.headers?.accept === 'application/json') {
      res.status(500).json({ error: JSON.parse(JSON.stringify(error)) })
      return
    }

    const title = `${config.get<string>('application.name')} (Express ${utils.version('express')})`

    const errorPagePath = path.resolve('views/errorPage.pug')

    // Secure-by-design: render from file instead of compiling dynamic template
    const html = pug.renderFile(errorPagePath, {
      title,
      error
    })

    res.status(500).send(html)
  }
}
