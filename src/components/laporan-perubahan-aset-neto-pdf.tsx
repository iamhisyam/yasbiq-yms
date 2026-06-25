import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica' },
  header: { textAlign: 'center', marginBottom: 12, borderBottomWidth: 2, borderBottomColor: '#1A1A1A', paddingBottom: 8 },
  title: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  subtitle: { fontSize: 9, color: '#666', marginTop: 2 },
  filterInfo: { textAlign: 'center', fontSize: 8, color: '#444', marginBottom: 10 },

  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 4, padding: 4, backgroundColor: '#e8e8e8', textTransform: 'uppercase', letterSpacing: 1 },
  subSectionLabel: { fontSize: 8, fontWeight: 'bold', paddingLeft: 4, paddingTop: 2, paddingBottom: 1, backgroundColor: '#f5f5f5', textTransform: 'uppercase', letterSpacing: 0.5, color: '#333' },
  table: { borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  tableHeader: { backgroundColor: '#f0f0f0', fontWeight: 'bold', fontSize: 8, textTransform: 'uppercase' },
  tableCell: { padding: 3, fontSize: 8 },
  colNama: { width: '40%' },
  colJumlah: { width: '15%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },

  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 6, color: '#999', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 6 },
})

function rp(n: number) { return `Rp${(n || 0).toLocaleString('id-ID')}` }

function Line({ label, value, valueLalu, bold, color, indent }: { label: string; value: string; valueLalu?: string; bold?: boolean; color?: string; indent?: boolean }) {
  return (
    <View style={[styles.tableRow, bold ? { fontWeight: 'bold', backgroundColor: '#fafafa' } : {}]}>
      <Text style={[styles.tableCell, styles.colNama, { paddingLeft: indent ? 12 : 4, fontWeight: bold ? 'bold' : 'normal' }]}>{label}</Text>
      <Text style={[styles.tableCell, styles.colJumlah, { fontWeight: 'bold', color: color || '#000' }]}>{value}</Text>
      <Text style={[styles.tableCell, styles.colTotal, { fontWeight: 'normal', color: '#666' }]}>{valueLalu || '-'}</Text>
    </View>
  )
}

function SubTotalLine({ label, value, valueLalu, color }: { label: string; value: string; valueLalu?: string; color?: string }) {
  return (
    <View style={[styles.tableRow, { fontWeight: 'bold', backgroundColor: '#f0f0f0', borderTopWidth: 1, borderTopColor: '#ccc' }]}>
      <Text style={[styles.tableCell, styles.colNama, { fontWeight: 'bold', fontSize: 7.5 }]}>{label}</Text>
      <Text style={[styles.tableCell, styles.colJumlah, { fontWeight: 'bold', fontSize: 7.5, color: color || '#000' }]}>{value}</Text>
      <Text style={[styles.tableCell, styles.colTotal, { fontWeight: 'normal', fontSize: 7.5, color: '#666' }]}>{valueLalu || '-'}</Text>
    </View>
  )
}

export function PerubahanAsetNetoPDF({ data, pengaturan }: { data: any; pengaturan?: Record<string, string> }) {
  const tahunIni = data.tahun || new Date().getFullYear()
  const tahunLalu = data.tahunLalu || Number(tahunIni) - 1

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="portrait">
        <View style={styles.header}>
          <Text style={styles.title}>{pengaturan?.nama || 'Yayasan Annahl'}</Text>
          <Text style={styles.subtitle}>Laporan Perubahan Aset Neto</Text>
          <Text style={[styles.subtitle, { fontSize: 8 }]}>Untuk Tahun yang Berakhir 31 Desember {tahunIni}</Text>
          <Text style={[styles.subtitle, { fontSize: 7 }]}>Disusun sesuai ISAK 35 — Entitas Berorientasi Non-Laba</Text>
        </View>

        {/* ─── ASET NETO TANPA PEMBATASAN ─── */}
        <Text style={styles.sectionTitle}>Aset Neto Tanpa Pembatasan</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>{tahunIni} (Rp)</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>{tahunLalu} (Rp)</Text>
          </View>

          <Line 
            label="Saldo Awal Tahun" 
            value={rp(data.tanpaPembatasan?.saldoAwal || 0)} 
            valueLalu={rp(data.tanpaPembatasan?.saldoAwalLalu || 0)} 
          />
          <Line 
            label="Surplus (Defisit) Tahun Berjalan" 
            value={rp(data.tanpaPembatasan?.surplus || 0)} 
            valueLalu={rp(data.tanpaPembatasan?.surplusLalu || 0)} 
            color={(data.tanpaPembatasan?.surplus || 0) >= 0 ? '#059669' : '#dc2626'} 
          />
          {(data.tanpaPembatasan?.asetDibebaskan || 0) !== 0 && (
            <Line 
              label="Aset Neto yang Dibebaskan dari Pembatasan" 
              value={rp(data.tanpaPembatasan?.asetDibebaskan || 0)} 
              valueLalu={rp(data.tanpaPembatasan?.asetDibebaskanLalu || 0)} 
              color="#059669" 
            />
          )}
          <SubTotalLine 
            label="Saldo Akhir Tahun" 
            value={rp(data.tanpaPembatasan?.saldoAkhir || 0)} 
            valueLalu={rp(data.tanpaPembatasan?.saldoAkhirLalu || 0)} 
            color="#2563eb" 
          />
        </View>

        {/* ─── ASET NETO DENGAN PEMBATASAN ─── */}
        <Text style={styles.sectionTitle}>Aset Neto Dengan Pembatasan</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>Tahun Ini (Rp)</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>Tahun Lalu (Rp)</Text>
          </View>

          <Line 
            label="Saldo Awal Tahun" 
            value={rp(data.denganPembatasan?.saldoAwal || 0)} 
            valueLalu={rp(data.denganPembatasan?.saldoAwalLalu || 0)} 
          />
          <Line 
            label="Surplus (Defisit) Tahun Berjalan" 
            value={rp(data.denganPembatasan?.surplus || 0)} 
            valueLalu={rp(data.denganPembatasan?.surplusLalu || 0)} 
            color={(data.denganPembatasan?.surplus || 0) >= 0 ? '#059669' : '#dc2626'} 
          />
          {(data.denganPembatasan?.asetDibebaskan || 0) !== 0 && (
            <Line 
              label="Aset Neto yang Dibebaskan dari Pembatasan" 
              value={rp(data.denganPembatasan?.asetDibebaskan || 0)} 
              valueLalu={rp(data.denganPembatasan?.asetDibebaskanLalu || 0)} 
              color="#dc2626" 
            />
          )}
          <SubTotalLine 
            label="Saldo Akhir Tahun" 
            value={rp(data.denganPembatasan?.saldoAkhir || 0)} 
            valueLalu={rp(data.denganPembatasan?.saldoAkhirLalu || 0)} 
            color="#7c3aed" 
          />
        </View>

        {/* ─── RINGKASAN ─── */}
        <Text style={styles.sectionTitle}>Ringkasan Perubahan Aset Neto</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>Tahun Ini (Rp)</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>Tahun Lalu (Rp)</Text>
          </View>

          <Line 
            label="Aset Neto Tanpa Pembatasan" 
            value={rp(data.tanpaPembatasan?.saldoAkhir || 0)} 
            valueLalu={rp(data.tanpaPembatasan?.saldoAkhirLalu || 0)} 
            color="#2563eb" 
          />
          <Line 
            label="Aset Neto Dengan Pembatasan" 
            value={rp(data.denganPembatasan?.saldoAkhir || 0)} 
            valueLalu={rp(data.denganPembatasan?.saldoAkhirLalu || 0)} 
            color="#7c3aed" 
          />
          <Line 
            label="JUMLAH ASET NETO" 
            value={rp(data.totalAkhir || 0)} 
            valueLalu={rp(data.totalAkhirLalu || 0)} 
            bold 
            color="#059669" 
          />
        </View>

        <Text style={styles.footer}>{pengaturan?.footerDokumen || 'Dicetak dari Sistem — ISAK 35 Non-Profit Entity'}</Text>
      </Page>
    </Document>
  )
}
