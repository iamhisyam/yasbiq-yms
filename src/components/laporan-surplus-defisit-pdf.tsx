import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { SurplusDefisitData } from '#/server/keuangan'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { textAlign: 'center', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#1A1A1A', paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  subtitle: { fontSize: 10, color: '#666', marginTop: 4 },
  filterInfo: { textAlign: 'center', fontSize: 9, color: '#444', marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 8, marginTop: 12, backgroundColor: '#f5f5f5', padding: 6, textTransform: 'uppercase', letterSpacing: 1 },
  subSectionTitle: { fontSize: 10, fontWeight: 'bold', marginTop: 4, marginBottom: 4, paddingLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5, color: '#666' },
  table: { borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 12 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  tableHeader: { backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: 8, textTransform: 'uppercase' },
  tableCell: { padding: 5, fontSize: 9 },
  colNama: { width: '50%' },
  colTahunIni: { width: '25%', textAlign: 'right' },
  colTahunLalu: { width: '25%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: '#1A1A1A', fontWeight: 'bold', fontSize: 10 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: '#999', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 8 },
})

function rp(n: number) { return `Rp${(n || 0).toLocaleString('id-ID')}` }

function Line({ label, value, valueLalu, bold, color, indent }: { label: string; value: string; valueLalu?: string; bold?: boolean; color?: string; indent?: boolean }) {
  return (
    <View style={[styles.tableRow, bold ? { fontWeight: 'bold', backgroundColor: '#fafafa' } : {}]}>
      <Text style={[styles.tableCell, styles.colNama, { paddingLeft: indent ? 15 : 5, fontWeight: bold ? 'bold' : 'normal' }]}>{label}</Text>
      <Text style={[styles.tableCell, styles.colTahunIni, { fontWeight: 'bold', color: color || '#000' }]}>{value}</Text>
      <Text style={[styles.tableCell, styles.colTahunLalu, { color: '#999' }]}>{valueLalu || '—'}</Text>
    </View>
  )
}

function SectionBlock({ title, items, totalLabel, totalValue, totalValueLalu, color }: {
  title: string; items: { nama: string; jumlah: number; jumlahLalu: number }[]; totalLabel: string; totalValue: string; totalValueLalu?: string; color?: string
}) {
  if (items.length === 0 && totalValue === 'Rp0') return null
  return (
    <>
      <Text style={styles.subSectionTitle}>{title}</Text>
      {items.map((item, i) => (
        <Line key={i} label={item.nama} value={rp(item.jumlah)} valueLalu={item.jumlahLalu ? rp(item.jumlahLalu) : undefined} indent />
      ))}
      <Line label={totalLabel} value={totalValue} valueLalu={totalValueLalu} bold color={color} />
    </>
  )
}

export function SurplusDefisitPDF({ surplus, periode, pengaturan }: {
  surplus: SurplusDefisitData; periode: string; pengaturan?: Record<string, string>
}) {
  const hasDenganPembatasan = surplus.denganPembatasan.pendapatan.length > 0 || surplus.denganPembatasan.beban.length > 0
  const tanpa = surplus.tanpaPembatasan
  const dengan = surplus.denganPembatasan

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{pengaturan?.nama || 'Yayasan Annahl'}</Text>
          <Text style={styles.subtitle}>Laporan Penghasilan Komprehensif</Text>
          <Text style={[styles.subtitle, { fontSize: 8 }]}>Periode: {periode}</Text>
          <Text style={[styles.subtitle, { fontSize: 7 }]}>Disusun sesuai ISAK 35 — Entitas Non-Laba</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4, gap: 8 }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', width: '20%', textAlign: 'right' }}>{surplus.tahun}</Text>
          <Text style={{ fontSize: 8, color: '#999', width: '5%', textAlign: 'center' }}>|</Text>
          <Text style={{ fontSize: 8, fontWeight: 'bold', width: '20%', textAlign: 'right' }}>{surplus.tahunLalu}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colTahunIni]}>{surplus.tahun}</Text>
            <Text style={[styles.tableCell, styles.colTahunLalu]}>{surplus.tahunLalu}</Text>
          </View>

          {/* TANPA PEMBATASAN */}
          <View style={[styles.tableRow, { backgroundColor: '#f0fdf0' }]}>
            <Text style={[styles.tableCell, { fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', width: '100%' }]}>TANPA PEMBATASAN DARI PEMBERI SUMBER DAYA</Text>
          </View>
          <SectionBlock title="Pendapatan" items={tanpa.pendapatan} totalLabel="Jumlah Pendapatan" totalValue={rp(tanpa.totalPendapatan)} totalValueLalu={undefined} color="#059669" />
          <SectionBlock title="Beban" items={tanpa.beban} totalLabel="Jumlah Beban" totalValue={rp(tanpa.totalBeban)} totalValueLalu={undefined} color="#dc2626" />
          <Line label="Surplus (Defisit) — Tanpa Pembatasan" value={rp(tanpa.surplus)} valueLalu={undefined} bold color={tanpa.surplus >= 0 ? '#059669' : '#dc2626'} />

          {/* DENGAN PEMBATASAN */}
          {hasDenganPembatasan && (
            <>
              <View style={[styles.tableRow, { backgroundColor: '#fefce8', borderTopWidth: 1, borderTopColor: '#1A1A1A' }]}>
                <Text style={[styles.tableCell, { fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', width: '100%' }]}>DENGAN PEMBATASAN DARI PEMBERI SUMBER DAYA</Text>
              </View>
              <SectionBlock title="Pendapatan" items={dengan.pendapatan} totalLabel="Jumlah Pendapatan" totalValue={rp(dengan.totalPendapatan)} totalValueLalu={undefined} color="#d97706" />
              {dengan.beban.length > 0 && (
                <SectionBlock title="Beban" items={dengan.beban} totalLabel="Jumlah Beban" totalValue={rp(dengan.totalBeban)} totalValueLalu={undefined} color="#dc2626" />
              )}
              <Line label="Surplus (Defisit) — Dengan Pembatasan" value={rp(dengan.surplus)} valueLalu={undefined} bold color={dengan.surplus >= 0 ? '#059669' : '#dc2626'} />
            </>
          )}

          {/* TOTAL */}
          <Line label="PENGHASILAN KOMPREHENSIF LAIN" value={rp(surplus.penghasilanKomprehensifLain)} valueLalu={undefined} bold />
          <Line label="TOTAL PENGHASILAN KOMPREHENSIF" value={rp(surplus.totalPenghasilanKomprehensif)} valueLalu={undefined} bold color={surplus.totalPenghasilanKomprehensif >= 0 ? '#059669' : '#dc2626'} />
        </View>

        <Text style={styles.footer}>{pengaturan?.footerDokumen || 'Dicetak dari Sistem — ISAK 35 Non-Profit Entity'}</Text>
      </Page>
    </Document>
  )
}
