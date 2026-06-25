import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#1A1A1A', paddingBottom: 14 },
  headerLeft: { width: '20%', justifyContent: 'center' },
  headerCenter: { width: '80%', justifyContent: 'center', paddingLeft: 12 },
  logo: { maxWidth: 80, maxHeight: 60, objectFit: 'contain' },
  title: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 3 },
  subTitle: { fontSize: 10, color: '#666', marginTop: 4 },
  receiptTitle: { textAlign: 'center', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginVertical: 16 },
  infoBlock: { marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, fontSize: 10 },
  infoLabel: { color: '#888', width: '30%' },
  infoValue: { fontWeight: 'bold', width: '65%' },
  table: { borderWidth: 1, borderColor: '#1A1A1A', marginVertical: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableCell: { padding: 6, fontSize: 9 },
  colTanggal: { width: '30%' },
  colMetode: { width: '40%' },
  colJumlah: { width: '30%', textAlign: 'right' },
  colNo: { width: '8%' },
  colItem: { width: '42%' },
  colQty: { width: '12%', textAlign: 'center' },
  colHarga: { width: '18%', textAlign: 'right' },
  colDiskon: { width: '20%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 8, paddingHorizontal: 6, borderTopWidth: 2, borderTopColor: '#1A1A1A', marginTop: 4 },
  totalText: { fontSize: 11, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 36, left: 50, right: 50, textAlign: 'center', fontSize: 9, color: '#999', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 10 },
  footerText: { marginBottom: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ddd', marginVertical: 8 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontSize: 10 },
})

function rp(n: number) { return `Rp${(n || 0).toLocaleString('id-ID')}` }

function stripMD(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/##*(.+)/g, '$1').replace(/- /g, '').replace(/\n/g, ', ').trim()
}

export function TagihanKwitansiPDF({ data, pengaturan }: { data: any; pengaturan?: Record<string, string> }) {
  const sisa = data.nominal - (data.diskon || 0) - data.sudahDibayar
  const namaYayasan = pengaturan?.nama || 'Yayasan Annahl'
  const headerDokumen = stripMD(pengaturan?.headerDokumen || '')
  const footerDokumen = stripMD(pengaturan?.footerDokumen || 'Terima kasih telah melakukan pembayaran tepat waktu')
  const logoDokumen = pengaturan?.logoDokumen || ''
  const kota = pengaturan?.kota || ''
  const noTelp = pengaturan?.telepon || ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoDokumen && (
            <View style={styles.headerLeft}>
              <Image style={styles.logo} src={logoDokumen} />
            </View>
          )}
          <View style={[styles.headerCenter, logoDokumen ? {} : { width: '100%', alignItems: 'center' }]}>
            <Text style={styles.title}>{namaYayasan}</Text>
            {headerDokumen && <Text style={styles.subTitle}>{headerDokumen}</Text>}
            {(kota || noTelp) && <Text style={[styles.subTitle, { fontSize: 8, marginTop: 2 }]}>{kota}{kota && noTelp ? ' — ' : ''}{noTelp}</Text>}
          </View>
        </View>

        <View style={styles.receiptTitle}>
          <Text>Kuitansi Pembayaran Tagihan</Text>
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Siswa</Text>
            <Text style={styles.infoValue}>{data.siswa?.nama || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>NIS</Text>
            <Text style={styles.infoValue}>{data.siswa?.nis || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kelas</Text>
            <Text style={styles.infoValue}>
              {data.siswa?.kelasRef?.nama || '-'}
              {data.siswa?.kelasRef?.tingkatRef?.nama ? ` (${data.siswa.kelasRef.tingkatRef.nama})` : ''}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tagihan</Text>
            <Text style={styles.infoValue}>{data.tagihan?.judul || data.tagihan?.tahunAjaran || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>{data.status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {data.tagihan?.items?.length > 0 && (
          <>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Rincian Item</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.colNo]}>No</Text>
                <Text style={[styles.tableCell, styles.colItem]}>Item</Text>
                <Text style={[styles.tableCell, styles.colQty]}>Qty</Text>
                <Text style={[styles.tableCell, styles.colHarga]}>Harga</Text>
                <Text style={[styles.tableCell, styles.colDiskon]}>Subtotal</Text>
              </View>
              {data.tagihan.items.map((it: any, i: number) => (
                <View key={it.id || i} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}>
                  <Text style={[styles.tableCell, styles.colNo]}>{i + 1}</Text>
                  <Text style={[styles.tableCell, styles.colItem, { fontWeight: 'bold' }]}>{it.nama}</Text>
                  <Text style={[styles.tableCell, styles.colQty]}>{it.qty}</Text>
                  <Text style={[styles.tableCell, styles.colHarga]}>{rp(it.hargaSatuan)}</Text>
                  <Text style={[styles.tableCell, styles.colDiskon, { fontWeight: 'bold' }]}>{rp(it.subtotal)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Riwayat Pembayaran</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.colTanggal]}>Tanggal</Text>
            <Text style={[styles.tableCell, styles.colMetode]}>Metode</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>Jumlah</Text>
          </View>
          {(data.pembayarans || []).length > 0 ? (
            data.pembayarans.map((p: any, i: number) => (
              <View key={p.id} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}>
                <Text style={[styles.tableCell, styles.colTanggal]}>{p.tanggalBayar}</Text>
                <Text style={[styles.tableCell, styles.colMetode, { textTransform: 'capitalize' }]}>{p.metode}</Text>
                <Text style={[styles.tableCell, styles.colJumlah, { fontWeight: 'bold' }]}>{rp(p.jumlahBayar)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { textAlign: 'center', color: '#999' }]}>Belum ada pembayaran</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryLine}>
          <Text style={{ fontWeight: 'bold', fontSize: 10 }}>Total Nominal</Text>
          <Text style={{ fontSize: 10 }}>{rp(data.nominal)}</Text>
        </View>
        {data.diskon > 0 && (
          <View style={styles.summaryLine}>
            <Text style={{ fontWeight: 'bold', fontSize: 10, color: '#2563eb' }}>Diskon Beasiswa</Text>
            <Text style={{ fontSize: 10, color: '#2563eb' }}>-{rp(data.diskon)}</Text>
          </View>
        )}
        <View style={[styles.summaryLine, { borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 6, marginTop: 4 }]}>
          <Text style={[styles.totalText]}>Total Dibayar</Text>
          <Text style={[styles.totalText, { color: '#059669' }]}>{rp(data.sudahDibayar)}</Text>
        </View>
        {sisa > 0 && (
          <View style={styles.summaryLine}>
            <Text style={{ fontWeight: 'bold', fontSize: 10, color: '#e11d48' }}>Sisa Tagihan</Text>
            <Text style={{ fontSize: 10, color: '#e11d48' }}>{rp(sisa)}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{footerDokumen}</Text>
          <Text style={[styles.footerText, { marginTop: 4, fontSize: 8 }]}>YMS — {namaYayasan}</Text>
        </View>
      </Page>
    </Document>
  )
}
