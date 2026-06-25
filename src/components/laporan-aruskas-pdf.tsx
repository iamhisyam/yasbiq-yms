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
  colNama: { width: '55%' },
  colJumlah: { width: '22.5%', textAlign: 'right' },
  colTotal: { width: '22.5%', textAlign: 'right' },

  detailRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fafafa' },
  detailCell: { padding: 2, fontSize: 7, paddingLeft: 12, fontStyle: 'italic', color: '#666' },
  detailAmount: { padding: 2, fontSize: 7, textAlign: 'right', fontStyle: 'italic', color: '#666' },

  balanceBox: { marginTop: 10, padding: 6, borderWidth: 1, borderColor: '#1A1A1A', backgroundColor: '#f8f8f8', alignItems: 'center' },
  balanceText: { fontSize: 8, fontWeight: 'bold' },
  balancePass: { color: '#059669' },

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

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailCell, styles.colNama]}>{label}</Text>
      <Text style={[styles.detailAmount, styles.colJumlah]}>{value}</Text>
      <Text style={[styles.detailAmount, styles.colTotal]}>-</Text>
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

export function ArusKasPDF({ data, pengaturan }: { data: any; pengaturan?: Record<string, string> }) {
  const tahunIni = data.tahun || new Date().getFullYear()
  const tahunLalu = data.tahunLalu || Number(tahunIni) - 1

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="portrait">
        <View style={styles.header}>
          <Text style={styles.title}>{pengaturan?.nama || 'Yayasan Annahl'}</Text>
          <Text style={styles.subtitle}>Laporan Arus Kas</Text>
          <Text style={[styles.subtitle, { fontSize: 8 }]}>Untuk Tahun yang Berakhir 31 Desember {tahunIni}</Text>
          <Text style={[styles.subtitle, { fontSize: 7 }]}>Disusun sesuai ISAK 35 — Entitas Berorientasi Non-Laba</Text>
        </View>

        {/* ─── ARUS KAS DARI AKTIVITAS OPERASI ─── */}
        <Text style={styles.sectionTitle}>Arus Kas dari Aktivitas Operasi</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>{tahunIni} (Rp)</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>{tahunLalu} (Rp)</Text>
          </View>

          {data.operasiItems?.length > 0 ? (
            data.operasiItems.map((item: any, i: number) => (
              <DetailLine key={`op-${i}`} label={item.nama} value={rp(item.masuk - item.keluar)} />
            ))
          ) : (
            <DetailLine label="Tidak ada transaksi" value="-" />
          )}

          <SubTotalLine 
            label="Kas Masuk dari Aktivitas Operasi" 
            value={rp(data.operasiMasuk)} 
            valueLalu={rp(data.operasiMasukLalu)} 
            color="#059669" 
          />
          <SubTotalLine 
            label="Kas Keluar dari Aktivitas Operasi" 
            value={rp(data.operasiKeluar)} 
            valueLalu={rp(data.operasiKeluarLalu)} 
            color="#dc2626" 
          />
          <Line 
            label="Kas Bersih dari Aktivitas Operasi" 
            value={rp(data.operasiNet)} 
            valueLalu={rp(data.operasiNetLalu)} 
            bold 
            color={data.operasiNet >= 0 ? '#059669' : '#dc2626'} 
          />
        </View>

        {/* ─── ARUS KAS DARI AKTIVITAS INVESTASI ─── */}
        <Text style={styles.sectionTitle}>Arus Kas dari Aktivitas Investasi</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>Tahun Ini (Rp)</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>Tahun Lalu (Rp)</Text>
          </View>

          {data.investasiItems?.length > 0 ? (
            data.investasiItems.map((item: any, i: number) => (
              <DetailLine key={`inv-${i}`} label={item.nama} value={rp(item.masuk - item.keluar)} />
            ))
          ) : (
            <DetailLine label="Tidak ada transaksi" value="-" />
          )}

          <SubTotalLine 
            label="Kas Masuk dari Aktivitas Investasi" 
            value={rp(data.investasiMasuk)} 
            valueLalu={rp(data.investasiMasukLalu)} 
            color="#059669" 
          />
          <SubTotalLine 
            label="Kas Keluar dari Aktivitas Investasi" 
            value={rp(data.investasiKeluar)} 
            valueLalu={rp(data.investasiKeluarLalu)} 
            color="#dc2626" 
          />
          <Line 
            label="Kas Bersih dari Aktivitas Investasi" 
            value={rp(data.investasiNet)} 
            valueLalu={rp(data.investasiNetLalu)} 
            bold 
            color={data.investasiNet >= 0 ? '#059669' : '#dc2626'} 
          />
        </View>

        {/* ─── ARUS KAS DARI AKTIVITAS PENDANAAN ─── */}
        <Text style={styles.sectionTitle}>Arus Kas dari Aktivitas Pendanaan</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>Tahun Ini (Rp)</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>Tahun Lalu (Rp)</Text>
          </View>

          {data.pendanaanItems?.length > 0 ? (
            data.pendanaanItems.map((item: any, i: number) => (
              <DetailLine key={`pend-${i}`} label={item.nama} value={rp(item.masuk - item.keluar)} />
            ))
          ) : (
            <DetailLine label="Tidak ada transaksi" value="-" />
          )}

          <SubTotalLine 
            label="Kas Masuk dari Aktivitas Pendanaan" 
            value={rp(data.pendanaanMasuk)} 
            valueLalu={rp(data.pendanaanMasukLalu)} 
            color="#059669" 
          />
          <SubTotalLine 
            label="Kas Keluar dari Aktivitas Pendanaan" 
            value={rp(data.pendanaanKeluar)} 
            valueLalu={rp(data.pendanaanKeluarLalu)} 
            color="#dc2626" 
          />
          <Line 
            label="Kas Bersih dari Aktivitas Pendanaan" 
            value={rp(data.pendanaanNet)} 
            valueLalu={rp(data.pendanaanNetLalu)} 
            bold 
            color={data.pendanaanNet >= 0 ? '#059669' : '#dc2626'} 
          />
        </View>

        {/* ─── RINGKASAN ─── */}
        <Text style={styles.sectionTitle}>Ringkasan Arus Kas</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>Tahun Ini (Rp)</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>Tahun Lalu (Rp)</Text>
          </View>

          <Line 
            label="Kas Bersih dari Aktivitas Operasi" 
            value={rp(data.operasiNet)} 
            valueLalu={rp(data.operasiNetLalu)} 
            color={data.operasiNet >= 0 ? '#059669' : '#dc2626'} 
          />
          <Line 
            label="Kas Bersih dari Aktivitas Investasi" 
            value={rp(data.investasiNet)} 
            valueLalu={rp(data.investasiNetLalu)} 
            color={data.investasiNet >= 0 ? '#059669' : '#dc2626'} 
          />
          <Line 
            label="Kas Bersih dari Aktivitas Pendanaan" 
            value={rp(data.pendanaanNet)} 
            valueLalu={rp(data.pendanaanNetLalu)} 
            color={data.pendanaanNet >= 0 ? '#059669' : '#dc2626'} 
          />
          <SubTotalLine 
            label="Kenaikan (Penurunan) Kas Bersih" 
            value={rp(data.kenaikanNeto)} 
            valueLalu={rp(data.kenaikanNetoLalu)} 
            color={data.kenaikanNeto >= 0 ? '#059669' : '#dc2626'} 
          />
          <Line 
            label="Kas Awal Periode" 
            value={rp(data.saldoAwal)} 
            valueLalu={rp(data.saldoAwalLalu)} 
          />
          <Line 
            label="KAS AKHIR PERIODE" 
            value={rp(data.saldoAkhir)} 
            valueLalu={rp(data.saldoAkhirLalu)} 
            bold 
            color="#059669" 
          />
        </View>

        {/* ─── Balance Check ─── */}
        <View style={styles.balanceBox}>
          <Text style={[styles.balanceText, styles.balancePass]}>
            KAS AKHIR PERIODE: {rp(data.saldoAkhir)} (Tahun Ini) | {rp(data.saldoAkhirLalu)} (Tahun Lalu)
          </Text>
        </View>

        <Text style={styles.footer}>{pengaturan?.footerDokumen || 'Dicetak dari Sistem — ISAK 35 Non-Profit Entity'}</Text>
      </Page>
    </Document>
  )
}
