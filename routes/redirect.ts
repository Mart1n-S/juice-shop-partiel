/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'

/**
 * Strict allowlist of internal redirection targets.
 * Only relative paths are allowed to prevent open redirect attacks.
 */
const ALLOWED_REDIRECT_PATHS = new Set<string>([
  '/profile',
  '/dashboard',
  '/orders'
  // D'autres chemins autorisés peuvent être ajoutés ici
])

export function performRedirect () {
  return (req: Request, res: Response, next: NextFunction) => {
    const toPath = req.query.to as string | undefined

    if (!toPath) {
      return res.status(400).json({
        error: 'Missing redirection target'
      })
    }

    if (!ALLOWED_REDIRECT_PATHS.has(toPath)) {
      return res.status(400).json({
        error: 'Invalid redirection target'
      })
    }

    res.redirect(toPath)
  }
}
