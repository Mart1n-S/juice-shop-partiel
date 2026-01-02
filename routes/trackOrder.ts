/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import * as utils from '../lib/utils'
import * as challengeUtils from '../lib/challengeUtils'
import { type Request, type Response } from 'express'
import * as db from '../data/mongodb'
import { challenges } from '../data/datacache'

export function trackOrder () {
  return (req: Request, res: Response) => {
    // Force orderId as a safe string
    const id = String(req.params.id).replace(/[^\w-]+/g, '')

    challengeUtils.solveIf(
      challenges.reflectedXssChallenge,
      () => utils.contains(id, '<iframe src="javascript:alert(`xss`)">')
    )

    // Safe MongoDB query (no dynamic code execution)
    db.ordersCollection.find({ orderId: id }).then((order: any[]) => {
      const result = utils.queryResultToJson(order)

      challengeUtils.solveIf(
        challenges.noSqlOrdersChallenge,
        () => result.data.length > 1
      )

      if (result.data[0] === undefined) {
        result.data[0] = { orderId: id }
      }

      res.json(result)
    }, () => {
      res.status(400).json({ error: 'Wrong Param' })
    })
  }
}
