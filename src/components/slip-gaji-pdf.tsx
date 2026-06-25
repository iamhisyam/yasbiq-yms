import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: 'Helvetica' },
  header: { textAlign: 'center', marginBottom: 16, borderBottomWidth: 2, borderBottomColor: '#1A1A1A', paddingBottom: 10 },
  yayasanNama: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  title: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 4, marginVertical: 6 },
  periode: { fontSize: 10, color: '#444' },
  info: { marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 8 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { width: '22%', fontWeight: 'bold', fontSize: 9 },
  infoValue: { fontSize: 9 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', paddingBottom: 4 },
  sectionTitle: { fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 },
  sectionLabelCol: { fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, fontSize: 9 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 8 },
  detailName: { fontSize: 9 },
  detailAmount: { fontSize: 9, textAlign: 'right' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ddd', marginVertical: 3, marginHorizontal: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#f5f5f5' },
  totalLabel: { fontWeight: 'bold', fontSize: 9, textTransform: 'uppercase' },
  totalAmount: { fontWeight: 'bold', fontSize: 9, textAlign: 'right' },
  grandTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 2, borderTopColor: '#1A1A1A',
    borderBottomWidth: 2, borderBottomColor: '#1A1A1A',
    paddingVertical: 10, paddingHorizontal: 8,
    marginTop: 8, marginBottom: 8,
  },
  grandTotalLabel: { fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  grandTotalAmount: { fontWeight: 'bold', fontSize: 12 },
  signature: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingHorizontal: 16 },
  signatureBlock: { alignItems: 'center', width: '40%' },
  signatureLabel: { fontSize: 9, marginBottom: 2 },
  signatureName: { fontSize: 9, fontWeight: 'bold', marginBottom: 20 },
  signatureLine: { fontSize: 9, color: '#888' },
  footer: { position: 'absolute', bottom: 18, left: 28, right: 28, textAlign: 'center', fontSize: 7, color: '#999', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 6 },
})

function fmt(n: number) { return new Intl.NumberFormat('id-ID').format(n || 0) }

interface SlipGajiPDFProps {
  penggajian: {
    pegawai: { nama: string; nip?: string; jabatan?: string; bank?: string; nomorRekening?: string }
    periode: string
    unit: { nama: string }
  }
  details: Array<{ tipe: 'penerimaan' | 'potongan'; nama: string; jumlah: number }>
  totalPenerimaan: number
  totalPotongan: number
  totalDiterima: number
  pph21: number
  bpjsKaryawan: number
  yayasanNama?: string
  bendaharaNama?: string
}

export function SlipGajiPDF({
  penggajian,
  details,
  totalPenerimaan,
  totalPotongan,
  totalDiterima,
  pph21,
  bpjsKaryawan,
  yayasanNama,
  bendaharaNama,
}: SlipGajiPDFProps) {
  const penerimaan = details.filter((d) => d.tipe === 'penerimaan')
  const potongan = details.filter((d) => d.tipe === 'potongan')

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.yayasanNama}>{yayasanNama || 'Yayasan'}</Text>
          <Text style={styles.title}>Slip Gaji</Text>
          <Text style={styles.periode}>{penggajian.periode}</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pegawai</Text>
            <Text style={styles.infoValue}>: {penggajian.pegawai.nama}</Text>
          </View>
          {penggajian.pegawai.nip && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>NIP</Text>
              <Text style={styles.infoValue}>: {penggajian.pegawai.nip}</Text>
            </View>
          )}
          {penggajian.pegawai.jabatan && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Jabatan</Text>
              <Text style={styles.infoValue}>: {penggajian.pegawai.jabatan}</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Penerimaan</Text>
          <Text style={styles.sectionLabelCol}>Jumlah</Text>
        </View>
        {penerimaan.map((item, i) => (
          <View key={i} style={styles.detailRow}>
            <Text style={styles.detailName}>{item.nama}</Text>
            <Text style={styles.detailAmount}>{fmt(item.jumlah)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Penerimaan</Text>
          <Text style={styles.totalAmount}>{fmt(totalPenerimaan)}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Potongan</Text>
          <Text style={styles.sectionLabelCol}>Jumlah</Text>
        </View>
        {potongan.map((item, i) => (
          <View key={i} style={styles.detailRow}>
            <Text style={styles.detailName}>{item.nama}</Text>
            <Text style={styles.detailAmount}>{fmt(item.jumlah)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Potongan</Text>
          <Text style={styles.totalAmount}>{fmt(totalPotongan)}</Text>
        </View>

        <View style={styles.grandTotal}>
          <Text style={styles.grandTotalLabel}>Total Diterima</Text>
          <Text style={styles.grandTotalAmount}>{fmt(totalDiterima)}</Text>
        </View>

        <View style={styles.signature}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Diterima oleh,</Text>
            <Text style={styles.signatureLine}>(_____________)</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Bendahara,</Text>
            <Text style={styles.signatureName}>{bendaharaNama || ''}</Text>
            <Text style={styles.signatureLine}>(_____________)</Text>
          </View>
        </View>

        <Text style={styles.footer}>Slip Gaji — {yayasanNama || 'Yayasan'} — {penggajian.periode}</Text>
      </Page>
    </Document>
  )
}
