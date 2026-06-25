/**
 * Database Seed Script
 * Melakukan seeding data awal: Yayasan, Unit Sekolah, dan Akun Pengguna (Better Auth)
 */
import { config } from 'dotenv'
// Muat environment variables sebelum modul lain di-load
config({ path: ['.env.local', '.env'] })

async function seed() {
  console.log('🌱 Memulai proses seeding database...')

  try {
    // Import modul secara dinamis setelah env terisi
    const { db } = await import('#/db/index.server')
    const { auth } = await import('#/lib/auth')
    const { yayasan, unit, userUnit, authUser } = await import('#/db/schema/index')
    const { eq } = await import('drizzle-orm')

    // 1. Buat Yayasan Default
    console.log('1. Membuat Yayasan...')
    let [yayasanRecord] = await db.select().from(yayasan).limit(1)
    if (!yayasanRecord) {
      ;[yayasanRecord] = await db
        .insert(yayasan)
        .values({
          nama: 'Yayasan Annahl',
          alamat: 'Jl. Raya Annahl No. 123, Jakarta',
          telepon: '021-1234567',
          email: 'info@annahl.org',
          website: 'www.annahl.org',
        })
        .returning()
      console.log(`✓ Yayasan "${yayasanRecord.nama}" dibuat.`)
    } else {
      console.log(`ℹ Yayasan "${yayasanRecord.nama}" sudah ada.`)
    }

    // 2. Buat Unit-Unit Sekolah
    console.log('2. Membuat Unit Sekolah...')
    const unitsData = [
      { nama: 'TK Annahl', jenjang: 'TK' as const },
      { nama: 'SD Annahl', jenjang: 'SD' as const },
      { nama: 'SMP Annahl', jenjang: 'SMP' as const },
    ]

    const unitRecords: any[] = []
    for (const u of unitsData) {
      let [existingUnit] = await db
        .select()
        .from(unit)
        .where(eq(unit.nama, u.nama))
        .limit(1)

      if (!existingUnit) {
        ;[existingUnit] = await db
          .insert(unit)
          .values({
            yayasanId: yayasanRecord.id,
            nama: u.nama,
            jenjang: u.jenjang,
            alamat: yayasanRecord.alamat,
            aktif: true,
          })
          .returning()
        console.log(`✓ Unit "${existingUnit.nama}" dibuat.`)
      } else {
        console.log(`ℹ Unit "${existingUnit.nama}" sudah ada.`)
      }
      unitRecords.push(existingUnit)
    }

    const tkUnit = unitRecords.find((u) => u.nama === 'TK Annahl')
    const sdUnit = unitRecords.find((u) => u.nama === 'SD Annahl')
    const smpUnit = unitRecords.find((u) => u.nama === 'SMP Annahl')

    // 3. Membuat Akun Pengguna via Better Auth
    console.log('3. Membuat Akun Pengguna...')

    const usersToCreate = [
      {
        email: 'operator@annahl.sch.id',
        password: 'password123',
        name: 'Ahmad Operator',
        role: 'operator' as const,
        units: [tkUnit], // hanya akses TK
      },
      {
        email: 'admin@annahl.sch.id',
        password: 'password123',
        name: 'Hani Admin',
        role: 'admin_yayasan' as const,
        units: [tkUnit, sdUnit, smpUnit], // akses semua unit
      },
      {
        email: 'superadmin@annahl.sch.id',
        password: 'password123',
        name: 'Super Admin',
        isSuperAdmin: true,
        units: [], // Super admin punya bypass global
      },
    ]

    for (const u of usersToCreate) {
      // Cek apakah user sudah terdaftar
      const [existingUser] = await db
        .select()
        .from(authUser)
        .where(eq(authUser.email, u.email))
        .limit(1)

      let userId = existingUser?.id

      if (!existingUser) {
        console.log(`Creating auth user: ${u.email}...`)
        // Daftarkan via Better Auth API agar password ter-hash dengan benar
        const authResult = await auth.api.signUpEmail({
          body: {
            email: u.email,
            password: u.password,
            name: u.name,
          },
          headers: new Headers({ 'content-type': 'application/json' }),
        })

        if (!authResult || !authResult.user) {
          throw new Error(`Gagal mendaftarkan user ${u.email}`)
        }

        userId = authResult.user.id
        console.log(`✓ Akun "${u.email}" berhasil dibuat.`)

        // Jika super admin, update flag isSuperAdmin
        if (u.isSuperAdmin) {
          await db
            .update(authUser)
            .set({ isSuperAdmin: true })
            .where(eq(authUser.id, userId))
          console.log(`✓ Role Super Admin disematkan pada "${u.email}".`)
        }
      } else {
        console.log(`ℹ Akun "${u.email}" sudah ada.`)
      }

      // 4. Assign hak akses unit ke user_unit table
      if (u.units && u.units.length > 0) {
        for (const targetUnit of u.units) {
          if (!targetUnit) continue

          // Cek apakah sudah ada aksesnya
          const access = await db.query.userUnit.findFirst({
            where: (uu, { and, eq }) =>
              and(eq(uu.userId, userId), eq(uu.unitId, targetUnit.id)),
          })

          if (!access) {
            await db.insert(userUnit).values({
              userId: userId,
              unitId: targetUnit.id,
              role: u.role || 'operator',
            })
            console.log(
              `✓ Akses unit "${targetUnit.nama}" diberikan ke "${u.email}" (${u.role}).`
            )
          }
        }
      }
    }

    console.log('🏁 Seeding selesai dengan sukses!')
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat seeding:', error)
  }
}

seed()
