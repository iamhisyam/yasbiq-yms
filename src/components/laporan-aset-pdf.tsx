import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: 'Helvetica' },
  header: { textAlign: 'center', marginBottom: 14, borderBottomWidth: 2, borderBottomColor: '#1A1A1A', paddingBottom: 8 },
  title: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2 },
  subtitle: { fontSize: 8, color: '#666', marginTop: 3 },
  filterInfo: { textAlign: 'center', fontSize: 8, color: '#444', marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginVertical: 8, textTransform: 'uppercase' },
  table: { borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  tableHeader: { backgroundColor: '#f5f5f5', fontWeight: 'bold', fontSize: 7, textTransform: 'uppercase' },
  tableCell: { padding: 4, fontSize: 7 },
  colNo: { width: '4%' },
  colKode: { width: '10%' },
  colNama: { width: '16%' },
  colKategori: { width: '10%' },
  colTgl: { width: '10%' },
  colHarga: { width: '12%', textAlign: 'right' },
  colManfaat: { width: '6%', textAlign: 'center' },
  colMetode: { width: '10%' },
  colAkum: { width: '10%', textAlign: 'right' },
  colPenyusutan: { width: '10%', textAlign: 'right' },
  colBuku: { width: '12%', textAlign: 'right' },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 6, color: '#999', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 6 },
  grandTotal: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: '#1A1A1A', fontWeight: 'bold', fontSize: 8, backgroundColor: '#fafafa' },
})

function rp(n: number) { return `Rp${(n || 0).toLocaleString('id-ID')}` }

export function LaporanAsetPDF({ data }: { data: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <View style={styles.header}>
          <Text style={styles.title}>Laporan Aset Tetap</Text>
          <Text style={styles.subtitle}>Untuk Keperluan SPT Tahunan PPh Badan — Format Sesuai Coretax DJP</Text>
        </View>
        <Text style={styles.filterInfo}>Tahun Pajak: {data.tahunPajak}</Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNo]}>No</Text>
            <Text style={[styles.tableCell, styles.colKode]}>Kode</Text>
            <Text style={[styles.tableCell, styles.colNama]}>Nama Aset</Text>
            <Text style={[styles.tableCell, styles.colKategori]}>Kategori</Text>
            <Text style={[styles.tableCell, styles.colTgl]}>Tgl. Perolehan</Text>
            <Text style={[styles.tableCell, styles.colHarga]}>Harga Perolehan</Text>
            <Text style={[styles.tableCell, styles.colManfaat]}>Masa Mnf.</Text>
            <Text style={[styles.tableCell, styles.colMetode]}>Metode</Text>
            <Text style={[styles.tableCell, styles.colAkum]}>Akum. s.d. {data.tahunPajak - 1}</Text>
            <Text style={[styles.tableCell, styles.colPenyusutan]}>Peny. Thn {data.tahunPajak}</Text>
            <Text style={[styles.tableCell, styles.colBuku]}>Nilai Buku</Text>
          </View>
          {data.items.map((item: any, i: number) => (
            <View key={item.id} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#fafafa' } : {}]}>
              <Text style={[styles.tableCell, styles.colNo]}>{i + 1}</Text>
              <Text style={[styles.tableCell, styles.colKode]}>{item.kodeAset || '-'}</Text>
              <Text style={[styles.tableCell, styles.colNama, { fontWeight: 'bold' }]}>{item.nama}</Text>
              <Text style={[styles.tableCell, styles.colKategori, { textTransform: 'capitalize' }]}>{item.kategori}</Text>
              <Text style={[styles.tableCell, styles.colTgl]}>{item.tanggalPerolehan}</Text>
              <Text style={[styles.tableCell, styles.colHarga]}>{rp(item.hargaPerolehan)}</Text>
              <Text style={[styles.tableCell, styles.colManfaat]}>{item.masaManfaat || '-'}</Text>
              <Text style={[styles.tableCell, styles.colMetode, { fontSize: 6 }]}>
                {item.metodePenyusutan === 'garis_lurus' ? 'G. Lurus' : item.metodePenyusutan === 'saldo_menurun' ? 'S. Menurun' : '-'}
              </Text>
              <Text style={[styles.tableCell, styles.colAkum, { color: '#dc2626' }]}>{rp(item.akumulasiPenyusutan)}</Text>
              <Text style={[styles.tableCell, styles.colPenyusutan, { color: '#dc2626' }]}>{rp(item.penyusutanTahunIni)}</Text>
              <Text style={[styles.tableCell, styles.colBuku, { fontWeight: 'bold', color: '#059669' }]}>{rp(item.nilaiBuku)}</Text>
            </View>
          ))}
          <View style={styles.grandTotal}>
            <Text style={[styles.tableCell, styles.colNo]}> </Text>
            <Text style={[styles.tableCell, styles.colKode]}> </Text>
            <Text style={[styles.tableCell, styles.colNama]}>TOTAL</Text>
            <Text style={[styles.tableCell, styles.colKategori]}> </Text>
            <Text style={[styles.tableCell, styles.colTgl]}> </Text>
            <Text style={[styles.tableCell, styles.colHarga]}>{rp(data.totalPerolehan)}</Text>
            <Text style={[styles.tableCell, styles.colManfaat]}> </Text>
            <Text style={[styles.tableCell, styles.colMetode]}> </Text>
            <Text style={[styles.tableCell, styles.colAkum, { color: '#dc2626' }]}>{rp(data.totalAkum)}</Text>
            <Text style={[styles.tableCell, styles.colPenyusutan, { color: '#dc2626' }]}>{rp(data.totalPenyusutanTahunIni)}</Text>
            <Text style={[styles.tableCell, styles.colBuku, { color: '#059669' }]}>{rp(data.totalNilaiBuku)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Dicetak dari Sistem Manajemen Yayasan — Laporan Aset Tetap Coretax DJP | Tahun Pajak {data.tahunPajak}</Text>
      </Page>
    </Document>
  )
}
