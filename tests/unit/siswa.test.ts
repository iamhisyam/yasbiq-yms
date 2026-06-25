import { expect, test, vi } from 'vitest'
import {
  getSiswaList,
  getSiswaById,
  createSiswa,
  updateSiswa,
  deleteSiswa,
} from '#/server/siswa'
import { mockDb, mockGetSession } from '../setup'

const dummyUnitId = '00000000-0000-4000-a000-000000000000'
const dummySiswaId = '11111111-1111-4111-b111-111111111111'

test('getSiswaList throws if unauthenticated', async () => {
  mockGetSession.mockResolvedValue(null)
  
  await expect(
    getSiswaList({
      data: { unitId: dummyUnitId },
    })
  ).rejects.toThrow('Unauthenticated')
})

test('getSiswaList throws if no unit access', async () => {
  mockDb.query.userUnit.findFirst.mockResolvedValue(null)
  
  await expect(
    getSiswaList({
      data: { unitId: dummyUnitId },
    })
  ).rejects.toThrow('Akses ditolak')
})

test('getSiswaList returns data and total count', async () => {
  const mockSiswaData = [
    { id: dummySiswaId, name: 'Ahmad', kelas: '1A', status: 'aktif' },
  ]
  mockDb.query.siswa.findMany.mockResolvedValue(mockSiswaData)
  mockDb.setResolvedValue([{ count: 1 }])

  const result = await getSiswaList({
    data: { unitId: dummyUnitId },
  })

  expect(result.data).toEqual(mockSiswaData)
  expect(result.total).toBe(1)
})

test('getSiswaById returns student if access is allowed', async () => {
  const mockSiswa = { id: dummySiswaId, nama: 'Ahmad', unitId: dummyUnitId }
  mockDb.query.siswa.findFirst.mockResolvedValue(mockSiswa)

  const result = await getSiswaById({
    data: { id: dummySiswaId },
  })

  expect(result).toEqual(mockSiswa)
})

test('createSiswa inserts record and returns it', async () => {
  const newSiswa = {
    unitId: dummyUnitId,
    nis: '12345',
    nama: 'Budi',
    kelas: '1B',
    tahunMasuk: 2024,
    status: 'aktif' as const,
  }
  
  mockDb.setResolvedValue([newSiswa])

  const result = await createSiswa({
    data: newSiswa,
  })

  expect(result).toEqual(newSiswa)
})

test('deleteSiswa soft-deletes (sets status to nonaktif)', async () => {
  const existingSiswa = { id: dummySiswaId, nama: 'Budi', unitId: dummyUnitId, status: 'aktif' }
  mockDb.query.siswa.findFirst.mockResolvedValue(existingSiswa)
  mockDb.setResolvedValue([{ ...existingSiswa, status: 'nonaktif' }])

  const result = await deleteSiswa({
    data: { id: dummySiswaId },
  })

  expect(result.status).toBe('nonaktif')
})
