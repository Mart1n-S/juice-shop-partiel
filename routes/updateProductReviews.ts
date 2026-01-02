/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'

import * as challengeUtils from '../lib/challengeUtils'
import { challenges } from '../data/datacache'
import * as security from '../lib/insecurity'
import * as db from '../data/mongodb'

export function updateProductReviews () {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = security.authenticatedUsers.from(req)

    const reviewId = String(req.body.id)
    const message = String(req.body.message)

    db.reviewsCollection.update(
      { _id: reviewId },
      { $set: { message } },
      { multi: false }
    ).then(
      (result: { modified: number, original: Array<{ author: any }> }) => {
        challengeUtils.solveIf(
          challenges.noSqlReviewsChallenge,
          () => { return result.modified > 1 }
        )

        challengeUtils.solveIf(
          challenges.forgedReviewChallenge,
          () => {
            return (
              user?.data &&
              result.original[0] &&
              result.original[0].author !== user.data.email &&
              result.modified === 1
            )
          }
        )

        res.json(result)
      },
      (err: unknown) => {
        res.status(500).json(err)
      }
    )
  }
}
