import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  pageLandscape: { padding: 30, fontSize: 8, fontFamily: 'Helvetica' },
  header: { textAlign: 'center', marginBottom: 16, borderBottomWidth: 2, borderBottomColor: '#1A1A1A', paddingBottom: 10 },
  headerWithLogo: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 2, borderBottomColor: '#1A1A1A', paddingBottom: 10 },
  headerLogoLeft: { width: '15%', justifyContent: 'center' },
  headerLogoCenter: { width: '85%', justifyContent: 'center', paddingLeft: 8 },
  logo: { maxWidth: 60, maxHeight: 50, objectFit: 'contain' },
  title: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  subtitle: { fontSize: 9, color: '#666', marginTop: 3 },
  filterInfo: { textAlign: 'center', fontSize: 9, color: '#444', marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1 },
  table: { borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 12 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  tableHeader: { backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: 8, textTransform: 'uppercase' },
  tableCell: { padding: 5, fontSize: 8 },
  colNo: { width: '6%' },
  colKelas: { width: '18%' },
  colTingkat: { width: '12%' },
  colSiswa: { width: '10%', textAlign: 'center' },
  colNominal: { width: '14%', textAlign: 'right' },
  colDiskon: { width: '10%', textAlign: 'right' },
  colTerkumpul: { width: '14%', textAlign: 'right' },
  colSisa: { width: '14%', textAlign: 'right' },
  colNama: { width: '22%' },
  colNis: { width: '12%' },
  colStatus: { width: '10%', textAlign: 'center' },
  colTgl: { width: '12%' },
  colTotal: { width: '14%', textAlign: 'right' },
  // Status table columns
  colStatusLabel: { width: '50%', padding: 5, fontSize: 8 },
  colStatusJumlah: { width: '25%', padding: 5, fontSize: 8, textAlign: 'center' },
  colStatusPersen: { width: '25%', padding: 5, fontSize: 8, textAlign: 'right' },
  summaryCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  card: { borderWidth: 1, borderColor: '#1A1A1A', padding: 8, width: '23%' },
  cardLabel: { fontSize: 7, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  grupHeader: { backgroundColor: '#e5e7eb', fontWeight: 'bold', fontSize: 9, padding: 6 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: '#999', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 8 },
})

function rp(n: number) { return `Rp${(n || 0).toLocaleString('id-ID')}` }

function stripMD(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/##*(.+)/g, '$1').replace(/- /g, '').replace(/\n/g, ', ').trim()
}

function HeaderWithLogo({ title, subtitle, pengaturan }: { title: string; subtitle?: string; pengaturan?: Record<string, string> }) {
  const logoDokumen = pengaturan?.logoDokumen || ''
  const namaYayasan = pengaturan?.nama || 'Yayasan Annahl'
  if (logoDokumen) {
    return (
      <View style={styles.headerWithLogo}>
        <View style={styles.headerLogoLeft}>
          <Image style={styles.logo} src={logoDokumen} />
        </View>
        <View style={styles.headerLogoCenter}>
          <Text style={styles.title}>{namaYayasan}</Text>
          <Text style={styles.subtitle}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { fontSize: 8 }]}>{subtitle}</Text>}
        </View>
      </View>
    )
  }
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{namaYayasan}</Text>
      <Text style={styles.subtitle}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { fontSize: 8 }]}>{subtitle}</Text>}
    </View>
  )
}

const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

// ─── LAPORAN PER KELAS ───────────────────────────────────────────────────────

type ByKelasItem = {
  kelasId: string; kelasNama: string; tingkatNama: string | null
  totalSiswa: number; totalNominal: number; totalDiskon: number
  totalTerkumpul: number; totalSisa: number
  lunas: number; cicil: number; terbit: number; dibebaskan: number
}

export function SppLaporanPerKelasPDF({ data, bulan, tahun, pengaturan }: { data: ByKelasItem[]; bulan: number; tahun: number; pengaturan?: Record<string, string> }) {
  const namaYayasan = pengaturan?.nama || 'Yayasan Annahl'
  const subHeader = pengaturan?.headerDokumen || 'Lembaga Pendidikan Islam Terpadu'
  const grand = data.reduce((s, d) => ({
    totalSiswa: s.totalSiswa + d.totalSiswa,
    totalNominal: s.totalNominal + d.totalNominal,
    totalDiskon: s.totalDiskon + d.totalDiskon,
    totalTerkumpul: s.totalTerkumpul + d.totalTerkumpul,
    totalSisa: s.totalSisa + d.totalSisa,
  }), { totalSiswa: 0, totalNominal: 0, totalDiskon: 0, totalTerkumpul: 0, totalSisa: 0 })

  return (
    <Document>
      <Page size="A4" style={styles.pageLandscape} orientation="landscape">
        <HeaderWithLogo title="Laporan SPP Per Kelas" subtitle={stripMD(pengaturan?.headerDokumen || '')} pengaturan={pengaturan} />
        <Text style={styles.filterInfo}>{BULAN[bulan]} {tahun}</Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNo]}>No</Text>
            <Text style={[styles.tableCell, styles.colKelas]}>Kelas</Text>
            <Text style={[styles.tableCell, styles.colTingkat]}>Tingkat</Text>
            <Text style={[styles.tableCell, styles.colSiswa]}>Siswa</Text>
            <Text style={[styles.tableCell, styles.colNominal]}>Nominal</Text>
            <Text style={[styles.tableCell, styles.colDiskon]}>Diskon</Text>
            <Text style={[styles.tableCell, styles.colTerkumpul]}>Terkumpul</Text>
            <Text style={[styles.tableCell, styles.colSisa]}>Sisa</Text>
          </View>
          {data.map((d, i) => (
            <View key={d.kelasId} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}>
              <Text style={[styles.tableCell, styles.colNo]}>{i + 1}</Text>
              <Text style={[styles.tableCell, styles.colKelas, { fontWeight: 'bold' }]}>{d.kelasNama}</Text>
              <Text style={[styles.tableCell, styles.colTingkat]}>{d.tingkatNama || '-'}</Text>
              <Text style={[styles.tableCell, styles.colSiswa]}>{d.totalSiswa}</Text>
              <Text style={[styles.tableCell, styles.colNominal]}>{rp(d.totalNominal)}</Text>
              <Text style={[styles.tableCell, styles.colDiskon]}>{rp(d.totalDiskon)}</Text>
              <Text style={[styles.tableCell, styles.colTerkumpul, { color: '#059669' }]}>{rp(d.totalTerkumpul)}</Text>
              <Text style={[styles.tableCell, styles.colSisa, { color: '#e11d48' }]}>{rp(d.totalSisa)}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, paddingVertical: 4 }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold' }}>Total Siswa: {grand.totalSiswa}</Text>
          <Text style={{ fontSize: 9, fontWeight: 'bold' }}>Total Nominal: {rp(grand.totalNominal)}</Text>
          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#059669' }}>Terkumpul: {rp(grand.totalTerkumpul)}</Text>
          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#e11d48' }}>Sisa: {rp(grand.totalSisa)}</Text>
        </View>

        <Text style={styles.footer}>{stripMD(pengaturan?.footerDokumen || 'Dicetak dari Sistem — Dokumen Laporan Resmi')}</Text>
      </Page>
    </Document>
  )
}

// ─── LAPORAN SUMMARY ─────────────────────────────────────────────────────────

type SummaryData = {
  totalSiswa: number; totalNominal: number; totalDiskon: number
  totalTerkumpul: number; totalSisa: number
  terbit: number; cicil: number; lunas: number; dibebaskan: number
}

export function SppLaporanSummaryPDF({ data, bulan, tahun, pengaturan }: { data: SummaryData; bulan: number; tahun: number; pengaturan?: Record<string, string> }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <HeaderWithLogo title="Rekap SPP Bulanan" subtitle={stripMD(pengaturan?.headerDokumen || '')} pengaturan={pengaturan} />
        <Text style={styles.filterInfo}>{BULAN[bulan]} {tahun}</Text>

        <View style={styles.sectionTitle}><Text>Ringkasan Keuangan</Text></View>
        <View style={styles.summaryCard}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Siswa</Text>
            <Text style={styles.cardValue}>{data.totalSiswa}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Nominal</Text>
            <Text style={styles.cardValue}>{rp(data.totalNominal)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Diskon</Text>
            <Text style={[styles.cardValue, { color: '#2563eb' }]}>{rp(data.totalDiskon)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Terkumpul</Text>
            <Text style={[styles.cardValue, { color: '#059669' }]}>{rp(data.totalTerkumpul)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sisa Tagihan</Text>
            <Text style={[styles.cardValue, { color: '#e11d48' }]}>{rp(data.totalSisa)}</Text>
          </View>
        </View>

        <View style={styles.sectionTitle}><Text>Status Pembayaran</Text></View>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colStatusLabel]}>Status</Text>
            <Text style={[styles.tableCell, styles.colStatusJumlah]}>Jumlah Siswa</Text>
            <Text style={[styles.tableCell, styles.colStatusPersen]}>Persentase</Text>
          </View>
          {[
            { label: 'Lunas', value: data.lunas, color: '#059669' },
            { label: 'Cicil', value: data.cicil, color: '#d97706' },
            { label: 'Terbit (Belum Bayar)', value: data.terbit, color: '#e11d48' },
            { label: 'Dibebaskan', value: data.dibebaskan, color: '#2563eb' },
          ].map((s, i) => (
            <View key={s.label} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}>
              <Text style={[styles.tableCell, styles.colStatusLabel, { color: s.color, fontWeight: 'bold' }]}>{s.label}</Text>
              <Text style={[styles.tableCell, styles.colStatusJumlah, { fontWeight: 'bold' }]}>{s.value}</Text>
              <Text style={[styles.tableCell, styles.colStatusPersen, { fontWeight: 'bold' }]}>{data.totalSiswa > 0 ? `${Math.round(s.value / data.totalSiswa * 100)}%` : '0%'}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>{stripMD(pengaturan?.footerDokumen || 'Dicetak dari Sistem — Dokumen Laporan Resmi')}</Text>
      </Page>
    </Document>
  )
}

// ─── LAPORAN DETAIL SISWA ────────────────────────────────────────────────────

type DetailSiswaItem = {
  siswaId: string
  nama: string
  nis: string
  kelasNama: string
  tingkatNama: string | null
  nominal: number
  diskon: number
  sudahDibayar: number
  sisa: number
  status: string
}

export type DetailByTingkat = {
  tingkatId: string
  tingkatNama: string | null
  kelasGroups: {
    kelasId: string
    kelasNama: string
    siswa: DetailSiswaItem[]
  }[]
}

export function SppLaporanDetailSiswaPDF({ data, bulan, tahun, pengaturan }: { data: DetailByTingkat[]; bulan: number; tahun: number; pengaturan?: Record<string, string> }) {
  const totalSemua = data.reduce((s, t) => {
    for (const kg of t.kelasGroups) {
      for (const sw of kg.siswa) {
        s.totalSiswa++
        s.totalNominal += sw.nominal
        s.totalDiskon += sw.diskon
        s.totalTerkumpul += sw.sudahDibayar
        s.totalSisa += sw.sisa
      }
    }
    return s
  }, { totalSiswa: 0, totalNominal: 0, totalDiskon: 0, totalTerkumpul: 0, totalSisa: 0 })

  return (
    <Document>
      <Page size="A4" style={styles.pageLandscape} orientation="landscape">
        <HeaderWithLogo title="Laporan Detail SPP Per Siswa" subtitle={stripMD(pengaturan?.headerDokumen || '')} pengaturan={pengaturan} />
        <Text style={styles.filterInfo}>{BULAN[bulan]} {tahun}</Text>

        {data.map((tingkat) => (
          <View key={tingkat.tingkatId} wrap={false}>
            <View style={[styles.tableRow, styles.grupHeader]}>
              <Text style={{ padding: 5, fontSize: 10, fontWeight: 'bold' }}>
                {tingkat.tingkatNama ? `Tingkat ${tingkat.tingkatNama}` : 'Tanpa Tingkat'} ({tingkat.kelasGroups.reduce((s, k) => s + k.siswa.length, 0)} siswa)
              </Text>
            </View>
            {tingkat.kelasGroups.map((kelas) => (
              <View key={kelas.kelasId} wrap={false}>
                <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
                  <Text style={{ padding: 4, paddingLeft: 12, fontSize: 9, fontWeight: 'bold', fontStyle: 'italic' }}>
                    {kelas.kelasNama} — {kelas.siswa.length} siswa
                  </Text>
                </View>
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, styles.colNo]}>No</Text>
                    <Text style={[styles.tableCell, styles.colNama]}>Nama</Text>
                    <Text style={[styles.tableCell, styles.colNis]}>NIS</Text>
                    <Text style={[styles.tableCell, styles.colNominal]}>Nominal</Text>
                    <Text style={[styles.tableCell, styles.colDiskon]}>Diskon</Text>
                    <Text style={[styles.tableCell, styles.colTerkumpul]}>Dibayar</Text>
                    <Text style={[styles.tableCell, styles.colSisa]}>Sisa</Text>
                    <Text style={[styles.tableCell, styles.colStatus]}>Status</Text>
                  </View>
                  {kelas.siswa.map((sw, i) => (
                    <View key={sw.siswaId} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}>
                      <Text style={[styles.tableCell, styles.colNo]}>{i + 1}</Text>
                      <Text style={[styles.tableCell, styles.colNama, { fontWeight: 'bold' }]}>{sw.nama}</Text>
                      <Text style={[styles.tableCell, styles.colNis]}>{sw.nis || '-'}</Text>
                      <Text style={[styles.tableCell, styles.colNominal]}>{rp(sw.nominal)}</Text>
                      <Text style={[styles.tableCell, styles.colDiskon, { color: '#2563eb' }]}>{sw.diskon > 0 ? rp(sw.diskon) : '-'}</Text>
                      <Text style={[styles.tableCell, styles.colTerkumpul, { color: '#059669' }]}>{sw.sudahDibayar > 0 ? rp(sw.sudahDibayar) : '-'}</Text>
                      <Text style={[styles.tableCell, styles.colSisa, { color: '#e11d48' }]}>{rp(sw.sisa)}</Text>
                      <Text style={[styles.tableCell, styles.colStatus, { textTransform: 'capitalize' }]}>{sw.status}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, paddingVertical: 4 }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold' }}>Total Siswa: {totalSemua.totalSiswa}</Text>
          <Text style={{ fontSize: 9, fontWeight: 'bold' }}>Total Nominal: {rp(totalSemua.totalNominal)}</Text>
          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#059669' }}>Terkumpul: {rp(totalSemua.totalTerkumpul)}</Text>
          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#e11d48' }}>Sisa: {rp(totalSemua.totalSisa)}</Text>
        </View>

        <Text style={styles.footer}>{stripMD(pengaturan?.footerDokumen || 'Dicetak dari Sistem — Dokumen Laporan Resmi')}</Text>
      </Page>
    </Document>
  )
}
