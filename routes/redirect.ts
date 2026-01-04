/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'

/**
 * Internal mapping of allowed redirection targets.
 * User input is only used as a key and never as a redirect destination.
 */
const REDIRECT_TARGETS = new Map<string, string>([
  ['profile', '/profile'],
  ['dashboard', '/dashboard'],
  ['orders', '/orders']
  // D'autres cibles internes peuvent être ajoutées ici
])

export function performRedirect () {
  return (req: Request, res: Response, next: NextFunction) => {
    const target = req.query.target as string | undefined

    if (!target) {
      return res.status(400).json({
        error: 'Missing redirection target'
      })
    }

    const redirectPath = REDIRECT_TARGETS.get(target)

    if (!redirectPath) {
      return res.status(400).json({
        error: 'Invalid redirection target'
      })
    }

    // Redirection vers une valeur interne non contrôlée par l'utilisateur
    res.redirect(redirectPath)
  }
}
