import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', marginBottom: 24, borderBottomWidth: 2, borderBottomColor: '#1A1A1A', paddingBottom: 12 },
  headerLogoLeft: { width: '15%', justifyContent: 'center' },
  headerCenter: { width: '85%', justifyContent: 'center', paddingLeft: 8 },
  logo: { maxWidth: 60, maxHeight: 50, objectFit: 'contain' },
  title: { fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  subtitle: { fontSize: 11, color: '#666', marginTop: 4 },
  infoGrid: { flexDirection: 'row', marginBottom: 20, gap: 16 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 8, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  infoValue: { fontSize: 10, fontWeight: 'bold' },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  table: { borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 12 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  tableHeader: { backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableCell: { padding: 6, fontSize: 9 },
  colNo: { width: '8%' }, colItem: { width: '32%' }, colQty: { width: '12%', textAlign: 'center' },
  colHarga: { width: '16%', textAlign: 'right' }, colDiskon: { width: '16%', textAlign: 'right' }, colSubtotal: { width: '16%', textAlign: 'right' },
  colNama: { width: '30%' }, colNis: { width: '20%' }, colStatus: { width: '20%', textAlign: 'center' },
  colDibayar: { width: '15%', textAlign: 'right' }, colSisa: { width: '15%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, paddingVertical: 8, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: '#1A1A1A', marginTop: 4 },
  totalText: { fontSize: 10, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 8 },
  keterangan: { backgroundColor: '#f9f9f9', padding: 8, fontSize: 9, marginBottom: 16, borderWidth: 1, borderColor: '#1A1A1A' },
})

function rp(n: number) { return `Rp${(n || 0).toLocaleString('id-ID')}` }

function stripMD(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/##*(.+)/g, '$1').replace(/- /g, '').replace(/\n/g, ', ').trim()
}

export function TagihanPDF({ tmpl, pengaturan }: { tmpl: any; pengaturan?: Record<string, string> }) {
  const namaYayasan = pengaturan?.nama || 'Yayasan Annahl'
  const headerDoc = stripMD(pengaturan?.headerDokumen || '')
  const footerDoc = stripMD(pengaturan?.footerDokumen || 'Dokumen Tagihan Resmi')
  const logo = pengaturan?.logoDokumen || ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logo ? (
            <>
              <View style={styles.headerLogoLeft}>
                <Image style={styles.logo} src={logo} />
              </View>
              <View style={styles.headerCenter}>
                <Text style={styles.title}>{namaYayasan}</Text>
                <Text style={styles.subtitle}>{tmpl.judul || 'Tagihan'}</Text>
                {headerDoc && <Text style={[styles.subtitle, { fontSize: 8, marginTop: 2, color: '#888' }]}>{headerDoc}</Text>}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>{namaYayasan}</Text>
              <Text style={styles.subtitle}>{tmpl.judul || 'Tagihan'}</Text>
            </>
          )}
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Tahun Ajaran</Text>
            <Text style={styles.infoValue}>{tmpl.tahunAjaran}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{tmpl.status?.charAt(0).toUpperCase() + tmpl.status?.slice(1)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Jatuh Tempo</Text>
            <Text style={styles.infoValue}>{tmpl.dueDate || '-'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Siswa</Text>
            <Text style={styles.infoValue}>{tmpl.siswaCount || 0} siswa</Text>
          </View>
        </View>

        {tmpl.keterangan && (
          <View style={styles.keterangan}>
            <Text>{tmpl.keterangan}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Rincian Item</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNo]}>No</Text>
            <Text style={[styles.tableCell, styles.colItem]}>Item</Text>
            <Text style={[styles.tableCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableCell, styles.colHarga]}>Harga</Text>
            <Text style={[styles.tableCell, styles.colDiskon]}>Diskon</Text>
            <Text style={[styles.tableCell, styles.colSubtotal]}>Subtotal</Text>
          </View>
          {(tmpl.items || []).map((it: any, i: number) => (
            <View key={it.id || i} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}>
              <Text style={[styles.tableCell, styles.colNo]}>{i + 1}</Text>
              <Text style={[styles.tableCell, styles.colItem, { fontWeight: 'bold' }]}>{it.nama}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{it.qty}</Text>
              <Text style={[styles.tableCell, styles.colHarga]}>{rp(it.hargaSatuan)}</Text>
              <Text style={[styles.tableCell, styles.colDiskon]}>{it.diskon > 0 ? rp(it.diskon) : '-'}</Text>
              <Text style={[styles.tableCell, styles.colSubtotal, { fontWeight: 'bold' }]}>{rp(it.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total: {rp(tmpl.nominal)}</Text>
        </View>

        {tmpl.siswaTagihan?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Siswa ({tmpl.siswaTagihan.length})
            </Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.colNo]}>No</Text>
                <Text style={[styles.tableCell, styles.colNama]}>Nama</Text>
                <Text style={[styles.tableCell, styles.colNis]}>NIS</Text>
                <Text style={[styles.tableCell, styles.colStatus]}>Status</Text>
                <Text style={[styles.tableCell, styles.colDibayar]}>Dibayar</Text>
                <Text style={[styles.tableCell, styles.colSisa]}>Sisa</Text>
              </View>
              {tmpl.siswaTagihan.map((st: any, i: number) => {
                const sisaSt = Math.max(st.nominal - (st.diskon || 0) - st.sudahDibayar, 0)
                return (
                  <View key={st.id} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}>
                    <Text style={[styles.tableCell, styles.colNo]}>{i + 1}</Text>
                    <Text style={[styles.tableCell, styles.colNama, { fontWeight: 'bold' }]}>{st.siswa?.nama || '-'}</Text>
                    <Text style={[styles.tableCell, styles.colNis]}>{st.siswa?.nis || '-'}</Text>
                    <Text style={[styles.tableCell, styles.colStatus, { textTransform: 'capitalize' }]}>{st.status}</Text>
                    <Text style={[styles.tableCell, styles.colDibayar]}>{st.sudahDibayar > 0 ? rp(st.sudahDibayar) : '-'}</Text>
                    <Text style={[styles.tableCell, styles.colSisa, { fontWeight: 'bold' }]}>{rp(sisaSt)}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        <Text style={styles.footer}>{footerDoc}</Text>
      </Page>
    </Document>
  )
}
