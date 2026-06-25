import { expect, test, vi } from 'vitest'
import {
  getTransaksiList,
  createTransaksi,
  updateTransaksi,
  getRingkasanKas,
  getKategoriList,
} from '#/server/keuangan'
import { mockDb } from '../setup'

const dummyUnitId = '00000000-0000-4000-a000-000000000000'
const dummyTransaksiId = '33333333-3333-4333-b333-333333333333'
const dummyKategoriId = '44444444-4444-4444-b444-444444444444'

test('getTransaksiList returns records and total count', async () => {
  const mockTransactions = [
    { id: dummyTransaksiId, unitId: dummyUnitId, tipe: 'pemasukan', jumlah: 500000 }
  ]
  mockDb.query.kasTransaksi.findMany.mockResolvedValue(mockTransactions)
  mockDb.setResolvedValue([{ count: 1 }])

  const result = await getTransaksiList({
    data: { unitId: dummyUnitId, page: 1, pageSize: 20 },
  })

  expect(result.data).toEqual(mockTransactions)
  expect(result.total).toBe(1)
})

test('createTransaksi inserts record and returns it', async () => {
  const transactionData = {
    unitId: dummyUnitId,
    kategoriId: dummyKategoriId,
    tipe: 'pengeluaran' as const,
    jumlah: 150000,
    keterangan: 'Beli ATK',
    tanggal: '2026-06-07',
  }
  
  mockDb.setResolvedValue([transactionData])

  const result = await createTransaksi({
    data: transactionData,
  })

  expect(result).toEqual(transactionData)
})

test('updateTransaksi throws if not found', async () => {
  mockDb.query.kasTransaksi.findFirst.mockResolvedValue(null)

  await expect(
    updateTransaksi({
      data: { id: dummyTransaksiId, data: { keterangan: 'Updated' } }
    })
  ).rejects.toThrow('Transaksi tidak ditemukan')
})

test('updateTransaksi performs update if minimum role is met', async () => {
  const existing = { id: dummyTransaksiId, unitId: dummyUnitId, keterangan: 'Beli ATK' }
  mockDb.query.kasTransaksi.findFirst.mockResolvedValue(existing)
  
  // Set role in unit to admin_yayasan
  mockDb.query.userUnit.findFirst.mockResolvedValue({
    userId: 'test-user-id',
    unitId: dummyUnitId,
    role: 'admin_yayasan',
  })

  const updatedRecord = { ...existing, keterangan: 'Updated ATK' }
  mockDb.setResolvedValue([updatedRecord])

  const result = await updateTransaksi({
    data: {
      id: dummyTransaksiId,
      data: { keterangan: 'Updated ATK' }
    }
  })

  expect(result).toEqual(updatedRecord)
})

test('getRingkasanKas returns aggregate sums and balances', async () => {
  const mockSummary = [
    { tipe: 'pemasukan', total: 1000000, count: 5 },
    { tipe: 'pengeluaran', total: 400000, count: 2 },
  ]
  mockDb.setResolvedValue(mockSummary)

  const result = await getRingkasanKas({
    data: { unitId: dummyUnitId },
  })

  expect(result.totalPemasukan).toBe(1000000)
  expect(result.totalPengeluaran).toBe(400000)
  expect(result.saldo).toBe(600000)
  expect(result.jumlahTransaksiPemasukan).toBe(5)
  expect(result.jumlahTransaksiPengeluaran).toBe(2)
})

test('getKategoriList returns categories', async () => {
  const mockCategories = [
    { id: dummyKategoriId, unitId: dummyUnitId, nama: 'SPP', tipe: 'pemasukan' }
  ]
  mockDb.query.kasKategori.findMany.mockResolvedValue(mockCategories)

  const result = await getKategoriList({
    data: {},
  })

  expect(result).toEqual(mockCategories)
})
