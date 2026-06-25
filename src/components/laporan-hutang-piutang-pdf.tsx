import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: 'Helvetica' },
  header: { textAlign: 'center', marginBottom: 14, borderBottomWidth: 2, borderBottomColor: '#1A1A1A', paddingBottom: 8 },
  title: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  subtitle: { fontSize: 8, color: '#666', marginTop: 3 },
  filterInfo: { textAlign: 'center', fontSize: 8, color: '#444', marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginTop: 12, marginBottom: 6, padding: 5, backgroundColor: '#f5f5f5', textTransform: 'uppercase' },
  table: { borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  tableHeader: { backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: 7, textTransform: 'uppercase' },
  tableCell: { padding: 4, fontSize: 7 },
  colNo: { width: '4%' },
  colCounter: { width: '18%' },
  colDesk: { width: '22%' },
  colTgl: { width: '10%' },
  colJT: { width: '10%' },
  colJumlah: { width: '12%', textAlign: 'right' },
  colSisa: { width: '12%', textAlign: 'right' },
  colAging: { width: '8%', textAlign: 'center' },
  colStatus: { width: '10%', textAlign: 'center' },
  agingCard: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  card: { borderWidth: 1, borderColor: '#1A1A1A', padding: 6, width: '23%' },
  cardLabel: { fontSize: 6, color: '#888', textTransform: 'uppercase' },
  cardValue: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 6, color: '#999', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 6 },
  grandTotal: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: '#1A1A1A', fontWeight: 'bold', fontSize: 8, backgroundColor: '#fafafa' },
})

function rp(n: number) { return `Rp${(n || 0).toLocaleString('id-ID')}` }

const AGING_COLOR: Record<string, string> = { '0-30': '#059669', '31-60': '#d97706', '61-90': '#ea580c', '>90': '#dc2626' }

export function LaporanHutangPiutangPDF({ hutang, piutang, totalHutang, totalPiutang, agingHutang, agingPiutang }: {
  hutang: any[]; piutang: any[]; totalHutang: number; totalPiutang: number
  agingHutang: Record<string, number>; agingPiutang: Record<string, number>
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <View style={styles.header}>
          <Text style={styles.title}>Laporan Hutang Piutang</Text>
          <Text style={styles.subtitle}>Untuk Keperluan SPT Tahunan PPh Badan — Coretax DJP</Text>
        </View>
        <Text style={styles.filterInfo}>Per {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>

        {/* Summary Cards */}
        <View style={styles.agingCard}>
          <View style={styles.card}><Text style={styles.cardLabel}>Total Hutang</Text><Text style={[styles.cardValue, { color: '#dc2626' }]}>{rp(totalHutang)}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>Total Piutang</Text><Text style={[styles.cardValue, { color: '#059669' }]}>{rp(totalPiutang)}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>Total Counterparty</Text><Text style={styles.cardValue}>{new Set([...hutang, ...piutang].map((i) => i.pihak)).size} pihak</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>Selisih (Piutang-Hutang)</Text><Text style={[styles.cardValue, { color: totalPiutang >= totalHutang ? '#059669' : '#dc2626' }]}>{rp(Math.abs(totalPiutang - totalHutang))}</Text></View>
        </View>

        {/* Hutang */}
        <Text style={styles.sectionTitle}>DAFTAR HUTANG USAHA</Text>
        {hutang.length === 0 ? (
          <Text style={{ fontSize: 8, color: '#999', marginBottom: 10 }}>Tidak ada hutang</Text>
        ) : (
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.colNo]}>No</Text>
              <Text style={[styles.tableCell, styles.colCounter]}>Counterparty</Text>
              <Text style={[styles.tableCell, styles.colDesk]}>Deskripsi</Text>
              <Text style={[styles.tableCell, styles.colTgl]}>Tanggal</Text>
              <Text style={[styles.tableCell, styles.colJT]}>Jatuh Tempo</Text>
              <Text style={[styles.tableCell, styles.colJumlah]}>Jumlah</Text>
              <Text style={[styles.tableCell, styles.colSisa]}>Sisa</Text>
              <Text style={[styles.tableCell, styles.colAging]}>Aging</Text>
              <Text style={[styles.tableCell, styles.colStatus]}>Status</Text>
            </View>
            {hutang.map((h, i) => (
              <View key={h.id} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}>
                <Text style={[styles.tableCell, styles.colNo]}>{i + 1}</Text>
                <Text style={[styles.tableCell, styles.colCounter, { fontWeight: 'bold' }]}>{h.pihak}</Text>
                <Text style={[styles.tableCell, styles.colDesk]}>{h.deskripsi}</Text>
                <Text style={[styles.tableCell, styles.colTgl]}>{h.tanggal}</Text>
                <Text style={[styles.tableCell, styles.colJT]}>{h.jatuhTempo || '-'}</Text>
                <Text style={[styles.tableCell, styles.colJumlah]}>{rp(h.jumlah)}</Text>
                <Text style={[styles.tableCell, styles.colSisa]}>{rp(h.sisa)}</Text>
                <Text style={[styles.tableCell, styles.colAging, { color: AGING_COLOR[h.agingBucket] || '#000', fontWeight: 'bold' }]}>{h.aging}h</Text>
                <Text style={[styles.tableCell, styles.colStatus, { textTransform: 'capitalize' }]}>{h.status === 'belum_lunas' ? 'Blm Lunas' : h.status}</Text>
              </View>
            ))}
            <View style={styles.grandTotal}>
              <Text style={[styles.tableCell, styles.colNo]}> </Text>
              <Text style={[styles.tableCell, styles.colCounter]}>TOTAL HUTANG</Text>
              <Text style={[styles.tableCell, styles.colDesk]}> </Text>
              <Text style={[styles.tableCell, styles.colTgl]}> </Text>
              <Text style={[styles.tableCell, styles.colJT]}> </Text>
              <Text style={[styles.tableCell, styles.colJumlah]}>{rp(hutang.reduce((s, h) => s + h.jumlah, 0))}</Text>
              <Text style={[styles.tableCell, styles.colSisa, { color: '#dc2626' }]}>{rp(totalHutang)}</Text>
              <Text style={[styles.tableCell, styles.colAging]}> </Text>
              <Text style={[styles.tableCell, styles.colStatus]}> </Text>
            </View>
          </View>
        )}

        {/* Aging Hutang */}
        <View style={styles.agingCard}>
          {Object.entries(agingHutang).map(([bucket, amount]) => (
            <View key={bucket} style={styles.card}>
              <Text style={[styles.cardLabel, { color: AGING_COLOR[bucket] || '#000' }]}>Aging {bucket} Hari</Text>
              <Text style={[styles.cardValue, { color: AGING_COLOR[bucket] || '#000' }]}>{rp(amount)}</Text>
            </View>
          ))}
        </View>

        {/* Piutang */}
        <Text style={styles.sectionTitle}>DAFTAR PIUTANG</Text>
        {piutang.length === 0 ? (
          <Text style={{ fontSize: 8, color: '#999', marginBottom: 10 }}>Tidak ada piutang</Text>
        ) : (
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.colNo]}>No</Text>
              <Text style={[styles.tableCell, styles.colCounter]}>Counterparty</Text>
              <Text style={[styles.tableCell, styles.colDesk]}>Deskripsi</Text>
              <Text style={[styles.tableCell, styles.colTgl]}>Tanggal</Text>
              <Text style={[styles.tableCell, styles.colJT]}>Jatuh Tempo</Text>
              <Text style={[styles.tableCell, styles.colJumlah]}>Jumlah</Text>
              <Text style={[styles.tableCell, styles.colSisa]}>Sisa</Text>
              <Text style={[styles.tableCell, styles.colAging]}>Aging</Text>
              <Text style={[styles.tableCell, styles.colStatus]}>Status</Text>
            </View>
            {piutang.map((p, i) => (
              <View key={p.id} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}>
                <Text style={[styles.tableCell, styles.colNo]}>{i + 1}</Text>
                <Text style={[styles.tableCell, styles.colCounter, { fontWeight: 'bold' }]}>{p.pihak}</Text>
                <Text style={[styles.tableCell, styles.colDesk]}>{p.deskripsi}</Text>
                <Text style={[styles.tableCell, styles.colTgl]}>{p.tanggal}</Text>
                <Text style={[styles.tableCell, styles.colJT]}>{p.jatuhTempo || '-'}</Text>
                <Text style={[styles.tableCell, styles.colJumlah]}>{rp(p.jumlah)}</Text>
                <Text style={[styles.tableCell, styles.colSisa]}>{rp(p.sisa)}</Text>
                <Text style={[styles.tableCell, styles.colAging, { color: AGING_COLOR[p.agingBucket] || '#000', fontWeight: 'bold' }]}>{p.aging}h</Text>
                <Text style={[styles.tableCell, styles.colStatus, { textTransform: 'capitalize' }]}>{p.status === 'belum_lunas' ? 'Blm Lunas' : p.status}</Text>
              </View>
            ))}
            <View style={styles.grandTotal}>
              <Text style={[styles.tableCell, styles.colNo]}> </Text>
              <Text style={[styles.tableCell, styles.colCounter]}>TOTAL PIUTANG</Text>
              <Text style={[styles.tableCell, styles.colDesk]}> </Text>
              <Text style={[styles.tableCell, styles.colTgl]}> </Text>
              <Text style={[styles.tableCell, styles.colJT]}> </Text>
              <Text style={[styles.tableCell, styles.colJumlah]}>{rp(piutang.reduce((s, p) => s + p.jumlah, 0))}</Text>
              <Text style={[styles.tableCell, styles.colSisa, { color: '#059669' }]}>{rp(totalPiutang)}</Text>
              <Text style={[styles.tableCell, styles.colAging]}> </Text>
              <Text style={[styles.tableCell, styles.colStatus]}> </Text>
            </View>
          </View>
        )}

        {/* Aging Piutang */}
        <View style={styles.agingCard}>
          {Object.entries(agingPiutang).map(([bucket, amount]) => (
            <View key={bucket} style={styles.card}>
              <Text style={[styles.cardLabel, { color: AGING_COLOR[bucket] || '#000' }]}>Aging {bucket} Hari</Text>
              <Text style={[styles.cardValue, { color: AGING_COLOR[bucket] || '#000' }]}>{rp(amount)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Dicetak dari Sistem Manajemen Yayasan — Lampiran SPT Tahunan PPh Badan | Hutang Piutang</Text>
      </Page>
    </Document>
  )
}
