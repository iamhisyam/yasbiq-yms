/**
 * Better Auth — Server Configuration
 * Email/Password auth dengan custom user fields untuk multi-unit YMS
 */
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '#/db/index.server'
import * as schema from '#/db/schema/index'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.authUser,
      session: schema.authSession,
      account: schema.authAccount,
      verification: schema.authVerification,
    },
  }),

  plugins: [tanstackStartCookies()],

  rateLimit: {
    window: 10,
    max: 20,
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      isSuperAdmin: {
        type: 'boolean',
        defaultValue: false,
        input: false, // tidak bisa di-set dari client
      },
    },
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60, // 1 menit cache
    },
  },

  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
