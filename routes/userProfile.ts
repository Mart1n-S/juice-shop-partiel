import { type Request, type Response, type NextFunction } from 'express'
import config from 'config'
import pug from 'pug'
import path from 'node:path'

import * as challengeUtils from '../lib/challengeUtils'
import { themes } from '../views/themes/themes'
import { challenges } from '../data/datacache'
import * as security from '../lib/insecurity'
import { UserModel } from '../models/user'
import * as utils from '../lib/utils'

function favicon () {
  return utils.extractFilename(config.get('application.favicon'))
}

export function getUserProfile () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const loggedInUser = security.authenticatedUsers.get(req.cookies.token)
    if (!loggedInUser) {
      next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
      return
    }

    let user: UserModel | null
    try {
      user = await UserModel.findByPk(loggedInUser.data.id)
    } catch (err) {
      next(err)
      return
    }

    if (!user) {
      next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
      return
    }

    const themeKey = config.get<string>('application.theme') as keyof typeof themes
    const theme = themes[themeKey] || themes['bluegrey-lightgreen']

    challengeUtils.solveIf(challenges.usernameXssChallenge, () => false)

    const html = pug.renderFile(
      path.resolve('views/userProfile.pug'),
      {
        username: user.username,
        email: user.email,
        emailHash: security.hash(user.email),
        title: config.get<string>('application.name'),
        favicon: favicon(),
        logo: utils.extractFilename(config.get('application.logo')),
        profileImage: user.profileImage,
        bgColor: theme.bgColor,
        textColor: theme.textColor,
        navColor: theme.navColor,
        primLight: theme.primLight,
        primDark: theme.primDark
      }
    )

    res.set({
      'Content-Security-Policy': "img-src 'self'; script-src 'self'"
    })

    res.send(html)
  }
}
