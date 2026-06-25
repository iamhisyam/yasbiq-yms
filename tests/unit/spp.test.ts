import { expect, test, vi } from 'vitest'
import { getSppTagihanList, generateSPP, getRingkasanSPP } from '#/server/spp'
import { bayarTagihan } from '#/server/tagihan'
import { mockDb } from '../setup'

const dummyUnitId = '00000000-0000-4000-a000-000000000000'
const dummySiswaId = '11111111-1111-4111-b111-111111111111'
const dummyTagihanId = '22222222-2222-4222-b222-222222222222'

test('getSppTagihanList returns list and count', async () => {
  const mockTagihans = [
    { id: dummyTagihanId, siswaId: dummySiswaId, nominal: 250000, status: 'terbit' }
  ]
  mockDb.query.tagihanSiswa.findMany.mockResolvedValue(mockTagihans)
  mockDb.setResolvedValue([{ count: 1 }])

  const result = await getSppTagihanList({
    data: { unitId: dummyUnitId, page: 1, pageSize: 20 },
  })

  expect(result.data).toEqual(mockTagihans)
  expect(result.total).toBe(1)
})

test('bayarTagihan records payment and updates status to lunas', async () => {
  const mockTagihan = {
    id: dummyTagihanId,
    unitId: dummyUnitId,
    nominal: 250000,
    sudahDibayar: 0,
    diskon: 0,
    status: 'terbit'
  }
  mockDb.query.tagihanSiswa.findFirst.mockResolvedValue(mockTagihan)

  mockDb.setResolvedValue([])

  const result = await bayarTagihan({
    data: {
      tagihanSiswaId: dummyTagihanId,
      jumlahBayar: 250000,
      tanggalBayar: '2026-06-07',
      metode: 'transfer',
    }
  })

  expect(result.success).toBe(true)
})

test('bayarTagihan records payment and updates status to cicil', async () => {
  const mockTagihan = {
    id: dummyTagihanId,
    unitId: dummyUnitId,
    nominal: 250000,
    sudahDibayar: 0,
    diskon: 0,
    status: 'terbit'
  }
  mockDb.query.tagihanSiswa.findFirst.mockResolvedValue(mockTagihan)

  mockDb.setResolvedValue([])

  const result = await bayarTagihan({
    data: {
      tagihanSiswaId: dummyTagihanId,
      jumlahBayar: 100000,
      tanggalBayar: '2026-06-07',
      metode: 'transfer',
    }
  })

  expect(result.success).toBe(true)
})

test('generateSPP inserts missing tagihans', async () => {
  const mockSiswa = [
    { id: dummySiswaId, nama: 'Siswa 1', kelasRef: { tingkat: '1' }, status: 'aktif' }
  ]
  mockDb.query.siswa.findMany.mockResolvedValue(mockSiswa)

  const mockSppSetting = [
    { tingkat: '1', nominal: 200000 }
  ]
  mockDb.query.sppSetting.findMany.mockResolvedValue(mockSppSetting)

  mockDb.query.tagihanSiswa.findMany.mockResolvedValue([])

  mockDb.setResolvedValue([])

  const result = await generateSPP({
    data: { unitId: dummyUnitId, bulan: 6, tahun: 2026 }
  })

  expect(result.generated).toBe(1)
  expect(result.skipped).toBe(0)
})

test('getRingkasanSPP aggregates metrics correctly', async () => {
  const mockResult = {
    total: 3,
    lunas: 1,
    cicil: 1,
    terbit: 1,
    dibebaskan: 0,
    totalNominal: 600000,
    totalTerkumpul: 250000,
  }
  mockDb.setSelectResolvedValue([mockResult])

  const result = await getRingkasanSPP({
    data: { unitId: dummyUnitId, bulan: 6, tahun: 2026 }
  })

  expect(result.total).toBe(3)
  expect(result.lunas).toBe(1)
  expect(result.terbit).toBe(1)
  expect(result.cicil).toBe(1)
  expect(result.totalNominal).toBe(600000)
  expect(result.totalTerkumpul).toBe(250000)
})
