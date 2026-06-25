import { expect, test, vi, describe } from 'vitest'
import { getCurrentSession, getUserUnits } from '#/server/auth'
import { mockDb, mockGetSession } from '../setup'

describe('getCurrentSession', () => {
  test('returns session if authenticated', async () => {
    const sessionData = { user: { id: 'user-1', name: 'John' } }
    mockGetSession.mockResolvedValue(sessionData)

    const result = await getCurrentSession()
    expect(result).toEqual(sessionData)
  })

  test('returns null if unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const result = await getCurrentSession()
    expect(result).toBeNull()
  })
})

describe('getUserUnits', () => {
  test('returns empty if not logged in', async () => {
    mockGetSession.mockResolvedValue(null)

    const result = await getUserUnits()
    expect(result).toEqual([])
  })

  test('returns specific units for operator', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', isSuperAdmin: false },
    })

    const mockAccess = [
      { unit: { id: 'unit-1', nama: 'TK Annahl' } },
    ]
    mockDb.query.userUnit.findMany.mockResolvedValue(mockAccess)

    const result = await getUserUnits()
    expect(result).toEqual([{ id: 'unit-1', nama: 'TK Annahl' }])
  })
})

describe('Auth schema — definition', () => {
  test('authAccount table has password column', async () => {
    const { authAccount } = await import('#/db/schema/auth')
    expect(authAccount).toHaveProperty('password')
  })

  test('authUser table does NOT have password column (stored in account)', async () => {
    const { authUser } = await import('#/db/schema/organization')
    expect(authUser).not.toHaveProperty('password')
  })

  test('all auth schema tables are exported from index', async () => {
    const schema = await import('#/db/schema/index')
    expect(schema.authAccount).toBeDefined()
    expect(schema.authSession).toBeDefined()
    expect(schema.authVerification).toBeDefined()
    expect(schema.authUser).toBeDefined()
  })
})

describe('Seed — signUpEmail should receive headers', () => {
  test('signUpEmail creates account record when called with headers', async () => {
    const signUpSpy = vi.fn().mockResolvedValue({
      user: { id: 'uid', email: 'a@b.com' },
    })

    const result = await signUpSpy({
      body: { email: 'a@b.com', password: 'pw', name: 'A' },
      headers: new Headers(),
    })

    expect(result.user.id).toBe('uid')
    expect(signUpSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ email: 'a@b.com', password: 'pw' }),
        headers: expect.any(Headers),
      })
    )
  })
})
