import { vi, beforeEach } from 'vitest'

// Mock getRequest
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: vi.fn(() => ({
    headers: new Headers(),
  })),
}))

// Mock createServerFn to run directly in tests without start context
vi.mock('@tanstack/react-start', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-start')>()
  return {
    ...original,
    createServerFn: (options: any) => {
      let validatorFn: any = null
      const builder = {
        validator: (v: any) => {
          validatorFn = v
          return builder
        },
        handler: (h: any) => {
          const run = async (input: any = {}) => {
            let validatedData = input.data
            if (validatorFn) {
              validatedData = validatorFn.parse(input.data)
            }
            return h({ data: validatedData })
          }
          Object.assign(run, builder)
          return run
        }
      }
      return builder
    }
  }
})

// Mock Better Auth
export const mockGetSession = vi.fn()
vi.mock('#/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

// Drizzle mock builder
export const mockDb = {
  _resolvedValue: [] as any,
  _selectResolvedValue: null as any,
  setResolvedValue(val: any) {
    this._resolvedValue = val
  },
  setSelectResolvedValue(val: any) {
    this._selectResolvedValue = val
  },
  then(resolve: any) {
    resolve(this._resolvedValue)
  },
  query: {
    siswa: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    tagihanSiswa: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    tagihan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    pembayaran: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    sppSetting: {
      findMany: vi.fn(),
    },
    sppTagihan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    beasiswa: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    siswaBeasiswa: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    tahunAjaran: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    kasTransaksi: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    kasKategori: {
      findMany: vi.fn(),
    },
    userUnit: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  select: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockImplementation(() => ({
        then: (resolve: any) => resolve(mockDb._selectResolvedValue || []),
      })),
      then: (resolve: any) => resolve(mockDb._selectResolvedValue || []),
    })),
    then: (resolve: any) => resolve(mockDb._selectResolvedValue || []),
  })),
  from: vi.fn().mockImplementation(() => mockDb),
  where: vi.fn().mockImplementation(() => mockDb),
  groupBy: vi.fn().mockImplementation(() => mockDb),
  orderBy: vi.fn().mockImplementation(() => mockDb),
  limit: vi.fn().mockImplementation(() => mockDb),
  offset: vi.fn().mockImplementation(() => mockDb),
  insert: vi.fn().mockImplementation(() => mockDb),
  update: vi.fn().mockImplementation(() => mockDb),
  delete: vi.fn().mockImplementation(() => mockDb),
  values: vi.fn().mockImplementation(() => mockDb),
  set: vi.fn().mockImplementation(() => mockDb),
  returning: vi.fn().mockImplementation(() => mockDb),
  transaction: vi.fn(async (cb) => cb(mockDb)),
}

vi.mock('#/db/index.server', () => ({
  db: mockDb,
}))

beforeEach(() => {
  vi.clearAllMocks()
  
  // Reset resolved value
  mockDb._resolvedValue = []
  
  // Default session mock
  mockGetSession.mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      isSuperAdmin: false,
    },
  })
  
  // Default unit access mock (allow access by default)
  mockDb.query.userUnit.findFirst.mockResolvedValue({
    id: 'access-id',
    userId: 'test-user-id',
    unitId: 'test-unit-id',
    role: 'operator',
  })
})
