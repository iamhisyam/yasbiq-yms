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
  colNama: { width: '50%' },
  colJumlah: { width: '20%', textAlign: 'right' },
  colJumlahLalu: { width: '20%', textAlign: 'right' },
  colTotal: { width: '10%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: '#1A1A1A', fontWeight: 'bold', fontSize: 9, backgroundColor: '#fafafa' },

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
      <Text style={[styles.tableCell, styles.colJumlahLalu, { fontWeight: 'normal', color: '#666' }]}>{valueLalu || '-'}</Text>
    </View>
  )
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailCell, styles.colNama]}>{label}</Text>
      <Text style={[styles.detailAmount, styles.colJumlah]}>{value}</Text>
      <Text style={[styles.detailAmount, styles.colJumlahLalu]}>-</Text>
    </View>
  )
}

function SubTotalLine({ label, value, valueLalu, color }: { label: string; value: string; valueLalu?: string; color?: string }) {
  return (
    <View style={[styles.tableRow, { fontWeight: 'bold', backgroundColor: '#f0f0f0', borderTopWidth: 1, borderTopColor: '#ccc' }]}>
      <Text style={[styles.tableCell, styles.colNama, { fontWeight: 'bold', fontSize: 7.5 }]}>{label}</Text>
      <Text style={[styles.tableCell, styles.colJumlah, { fontWeight: 'bold', fontSize: 7.5, color: color || '#000' }]}>{value}</Text>
      <Text style={[styles.tableCell, styles.colJumlahLalu, { fontWeight: 'normal', fontSize: 7.5, color: '#666' }]}>{valueLalu || '-'}</Text>
    </View>
  )
}

export function NeracaPDF({ data, pengaturan }: { data: any; pengaturan?: Record<string, string> }) {
  const balance = data.totalAset === (data.totalLiabilitas + data.asetNeto)
  const diff = Math.abs(data.totalAset - (data.totalLiabilitas + data.asetNeto))
  const tahunIni = data.tahun || new Date().getFullYear()
  const tahunLalu = data.tahunLalu || Number(tahunIni) - 1

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="portrait">
        <View style={styles.header}>
          <Text style={styles.title}>{pengaturan?.nama || 'Yayasan Annahl'}</Text>
          <Text style={styles.subtitle}>Laporan Posisi Keuangan (Neraca)</Text>
          <Text style={[styles.subtitle, { fontSize: 8 }]}>Per 31 Desember {tahunIni}</Text>
          <Text style={[styles.subtitle, { fontSize: 7 }]}>Disusun sesuai ISAK 35 — Entitas Berorientasi Non-Laba</Text>
        </View>

        {/* ─── ASET ─── */}
        <Text style={styles.sectionTitle}>ASET</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>{tahunIni} (Rp)</Text>
            <Text style={[styles.tableCell, styles.colJumlahLalu]}>{tahunLalu} (Rp)</Text>
          </View>

          {/* Aset Lancar */}
          <Text style={styles.subSectionLabel}>Aset Lancar</Text>
          <Line label="Kas dan Setara Kas" value={rp(data.kasBank)} valueLalu={rp(data.kasBankLalu)} />
          {data.detailBank?.length > 0 && data.detailBank.map((d: any, i: number) => (
            <DetailLine key={`bank-${i}`} label={`  ${d.label}`} value={rp(d.jumlah)} />
          ))}
          <Line label="Piutang SPP" value={rp(data.piutangSPP)} valueLalu={rp(data.piutangSPPLalu)} />
          {data.detailPiutangSPP?.length > 0 && data.detailPiutangSPP.map((d: any, i: number) => (
            <DetailLine key={`piutang-spp-${i}`} label={`  ${d.label}`} value={rp(d.jumlah)} />
          ))}
          <Line label="Piutang Lainnya" value={rp(data.piutangLain)} valueLalu={rp(data.piutangLainLalu)} />
          {data.detailPiutangLain?.length > 0 && data.detailPiutangLain.map((d: any, i: number) => (
            <DetailLine key={`piutang-lain-${i}`} label={`  ${d.label}`} value={rp(d.jumlah)} />
          ))}
          {(data.asetLancarLainnya || 0) > 0 && <Line label="Aset Lancar Lainnya" value={rp(data.asetLancarLainnya)} valueLalu={rp(data.asetLancarLainnyaLalu)} />}
          <SubTotalLine label="Jumlah Aset Lancar" value={rp(data.totalAsetLancar)} valueLalu={rp(data.totalAsetLancarLalu)} color="#2563eb" />

          {/* Aset Tidak Lancar */}
          <Text style={styles.subSectionLabel}>Aset Tidak Lancar</Text>
          <Line label="Aset Tetap (Nilai Buku)" value={rp(data.asetTetap)} valueLalu={rp(data.asetTetapLalu)} />
          {data.detailAsetTetap?.length > 0 && data.detailAsetTetap.map((d: any, i: number) => (
            <DetailLine key={`aset-${i}`} label={`  ${d.label}`} value={rp(d.jumlah)} />
          ))}
          <SubTotalLine label="Jumlah Aset Tidak Lancar" value={rp(data.totalAsetTidakLancar)} valueLalu={rp(data.totalAsetTidakLancarLalu)} color="#7c3aed" />

          <Line label="JUMLAH ASET" value={rp(data.totalAset)} valueLalu={rp(data.totalAsetLalu)} bold color="#059669" />
        </View>

        {/* ─── LIABILITAS ─── */}
        <Text style={styles.sectionTitle}>LIABILITAS</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>Tahun Ini (Rp)</Text>
            <Text style={[styles.tableCell, styles.colJumlahLalu]}>Tahun Lalu (Rp)</Text>
          </View>

          {/* Liabilitas Jangka Pendek */}
          <Text style={styles.subSectionLabel}>Liabilitas Jangka Pendek</Text>
          <Line label="Utang Usaha" value={rp(data.hutangJangkaPendek)} valueLalu={rp(data.hutangJangkaPendekLalu)} />
          {data.detailHutangJangkaPendek?.length > 0 && data.detailHutangJangkaPendek.map((d: any, i: number) => (
            <DetailLine key={`utang-usaha-${i}`} label={`  ${d.label}`} value={rp(d.jumlah)} />
          ))}
          <Line label="Utang Gaji" value={rp(data.hutangGaji)} valueLalu={rp(data.hutangGajiLalu)} />
          {data.detailHutangGaji?.length > 0 && data.detailHutangGaji.map((d: any, i: number) => (
            <DetailLine key={`utang-gaji-${i}`} label={`  ${d.label}`} value={rp(d.jumlah)} />
          ))}
          <Line label="Utang Pajak (PPh 21)" value={rp(data.hutangPajak)} valueLalu={rp(data.hutangPajakLalu)} />
          {data.detailHutangPajak?.length > 0 && data.detailHutangPajak.map((d: any, i: number) => (
            <DetailLine key={`utang-pajak-${i}`} label={`  ${d.label}`} value={rp(d.jumlah)} />
          ))}
          <Line label="Utang BPJS" value={rp(data.hutangBpjs || 0)} valueLalu={rp(data.hutangBpjsLalu || 0)} />
          {data.detailHutangBpjs?.length > 0 && data.detailHutangBpjs.map((d: any, i: number) => (
            <DetailLine key={`utang-bpjs-${i}`} label={`  ${d.label}`} value={rp(d.jumlah)} />
          ))}
          {(data.pendapatanDiterimaDimuka || 0) > 0 && <Line label="Pendapatan Diterima di Muka" value={rp(data.pendapatanDiterimaDimuka)} valueLalu={rp(data.pendapatanDiterimaDimukaLalu || 0)} />}
          <SubTotalLine label="Jumlah Liabilitas Jangka Pendek" value={rp(data.totalLiabilitasJangkaPendek)} valueLalu={rp(data.totalLiabilitasJangkaPendekLalu)} color="#dc2626" />

          {/* Liabilitas Jangka Panjang */}
          {(data.hutangJangkaPanjang || 0) > 0 && (
            <>
              <Text style={styles.subSectionLabel}>Liabilitas Jangka Panjang</Text>
              <Line label="Utang Jangka Panjang" value={rp(data.hutangJangkaPanjang)} valueLalu={rp(data.hutangJangkaPanjangLalu || 0)} />
              {data.detailHutangJangkaPanjang?.length > 0 && data.detailHutangJangkaPanjang.map((d: any, i: number) => (
                <DetailLine key={`utang-jp-${i}`} label={`  ${d.label}`} value={rp(d.jumlah)} />
              ))}
              <SubTotalLine label="Jumlah Liabilitas Jangka Panjang" value={rp(data.totalLiabilitasJangkaPanjang)} valueLalu={rp(data.totalLiabilitasJangkaPanjangLalu || 0)} color="#ea580c" />
            </>
          )}

          <Line label="TOTAL LIABILITAS" value={rp(data.totalLiabilitas)} valueLalu={rp(data.totalLiabilitasLalu)} bold color="#dc2626" />
        </View>

        {/* ─── ASET NETO ─── */}
        <Text style={styles.sectionTitle}>ASET NETO</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, styles.colNama]}>Uraian</Text>
            <Text style={[styles.tableCell, styles.colJumlah]}>Tahun Ini (Rp)</Text>
            <Text style={[styles.tableCell, styles.colJumlahLalu]}>Tahun Lalu (Rp)</Text>
          </View>

          {/* Aset Neto Tanpa Pembatasan */}
          <Text style={styles.subSectionLabel}>Tanpa Pembatasan dari Pemberi Sumber Daya</Text>
          <Line label="Surplus Akumulasian" value={rp(data.surplusAkumulasian || 0)} valueLalu={rp(data.surplusAkumulasianLalu || 0)} indent />
          {(data.penghasilanKomprehensifLain || 0) !== 0 && <Line label="Penghasilan Komprehensif Lain" value={rp(data.penghasilanKomprehensifLain || 0)} valueLalu={rp(data.penghasilanKomprehensifLainLalu || 0)} indent />}
          <SubTotalLine label="Jumlah Aset Neto Tanpa Pembatasan" value={rp(data.sisaDanaTidakTerikat || data.surplusAkumulasian || 0)} valueLalu={rp(data.sisaDanaTidakTerikatLalu || data.surplusAkumulasianLalu || 0)} color="#2563eb" />

          {/* Aset Neto Dengan Pembatasan */}
          {(data.sisaDanaTerikatTemporer > 0 || data.sisaDanaTerikatPermanen > 0) && (
            <>
              <Text style={styles.subSectionLabel}>Dengan Pembatasan dari Pemberi Sumber Daya</Text>
              {data.sisaDanaTerikatTemporer > 0 && <Line label="Terikat Temporer" value={rp(data.sisaDanaTerikatTemporer)} valueLalu={rp(data.sisaDanaTerikatTemporerLalu || 0)} indent />}
              {data.sisaDanaTerikatPermanen > 0 && <Line label="Terikat Permanen" value={rp(data.sisaDanaTerikatPermanen)} valueLalu={rp(data.sisaDanaTerikatPermanenLalu || 0)} indent />}
              <SubTotalLine label="Jumlah Aset Neto Dengan Pembatasan" value={rp(data.sisaDanaTerikatTemporer + data.sisaDanaTerikatPermanen)} valueLalu={rp((data.sisaDanaTerikatTemporerLalu || 0) + (data.sisaDanaTerikatPermanenLalu || 0))} color="#7c3aed" />
            </>
          )}

          <Line label="JUMLAH ASET NETO" value={rp(data.asetNeto)} valueLalu={rp(data.asetNetoLalu)} bold color="#2563eb" />
          <Line label="TOTAL LIABILITAS DAN ASET NETO" value={rp(data.totalLiabilitas + data.asetNeto)} valueLalu={rp((data.totalLiabilitasLalu || 0) + (data.asetNetoLalu || 0))} bold color="#000" />
        </View>

        {/* ─── Balance Check ─── */}
        <View style={styles.balanceBox}>
          <Text style={[styles.balanceText, balance ? styles.balancePass : { color: '#dc2626' }]}>
            TOTAL ASET ({rp(data.totalAset)}) = TOTAL LIABILITAS ({rp(data.totalLiabilitas)}) + ASET NETO ({rp(data.asetNeto)})
            {'  '}{balance ? '✓ SEIMBANG' : `✗ SELISIH Rp${diff.toLocaleString('id-ID')}`}
          </Text>
        </View>

        <Text style={styles.footer}>{pengaturan?.footerDokumen || 'Dicetak dari Sistem — ISAK 35 Non-Profit Entity'}</Text>
      </Page>
    </Document>
  )
}