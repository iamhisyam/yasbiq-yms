import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { UnitProvider, useUnit } from '#/lib/unit-context'
import { signOut } from '#/lib/auth-client'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Wallet,
  LogOut,
  Building2,
  ChevronDown,
  Menu,
  X,
  Shield,
  UserCog,
  GraduationCap,
  Calendar,
  BookOpen,
  Briefcase,
  DollarSign,
  Landmark,
  Banknote,
  Award,
  Receipt,
  Layers,
  Settings,
  Tag,
  BarChart3,
  HandHeart,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { Combobox } from '#/components/ui/combobox'

const ROUTE_ROLES: Record<string, string> = {
  '/dashboard': 'admin_yayasan',
  '/laporan-keuangan': 'admin_yayasan',
  '/bank': 'admin_yayasan',
  '/pegawai': 'admin_yayasan',
  '/aset': 'admin_yayasan',
  '/beasiswa': 'admin_yayasan',
  '/hutang-piutang': 'admin_yayasan',
  '/penggajian': 'admin_yayasan',
  '/penggajian-pegawai': 'admin_yayasan',
  '/dana': 'admin_yayasan',
  '/anggaran': 'admin_yayasan',
  '/tahun-ajaran': 'admin_yayasan',
  '/kurikulum': 'admin_yayasan',
  '/bos': 'admin_yayasan',
  '/general': 'admin_yayasan',
  '/spp': 'operator',
  '/tagihan': 'operator',
  '/keuangan': 'operator',
  '/pengaturan': 'operator',
  '/user': 'super_admin',
  '/role': 'super_admin',
  '/unit': 'super_admin',
  '/vendor': 'super_admin',
  '/kategori': 'super_admin',
  '/coa': 'super_admin',
}

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: async ({ location }) => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })

    const pathname = location.pathname
    const prefixes = Object.keys(ROUTE_ROLES).sort((a, b) => b.length - a.length)
    const matched = prefixes.find((p) => pathname === p || pathname.startsWith(p + '/'))
    if (matched) {
      const minRole = ROUTE_ROLES[matched]
      const { allowed } = await requireRole({ data: { minimumRole: minRole as any } })
      if (!allowed) throw redirect({ to: '/siswa' })
    }

    return { session }
  },
  pendingComponent: () => (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="animate-spin w-8 h-8 border-[3px] border-nb-ink border-t-transparent rounded-full" />
    </div>
  ),
  pendingMs: 0,
  pendingMinMs: 0,
  component: DashboardLayoutWrapper,
})

function DashboardLayoutWrapper() {
  const { session } = Route.useRouteContext()
  
  return (
    <UnitProvider>
      <DashboardLayout user={session.user} />
    </UnitProvider>
  )
}

function DashboardLayout({ user }: { user: any }) {
  const { activeUnit, units, setActiveUnitId, isLoading, yayasanFilterUnitId, setYayasanFilterUnitId } = useUnit()
  const [unitOpen, setUnitOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>('yayasan')
  const navigate = useNavigate()

  const location = useLocation()

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-[3px] border-nb-ink border-t-transparent rounded-full" />
      </div>
    )
  }

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: '/login' })
        }
      }
    })
  }

  const isSuper = (user as any).isSuperAdmin

  const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    admin_yayasan: 'Admin Yayasan',
    operator: 'Operator',
    guru: 'Guru',
  }
  const ROLE_COLORS: Record<string, string> = {
    super_admin: 'bg-purple-100 border-purple-800 text-purple-800',
    admin_yayasan: 'bg-blue-100 border-blue-800 text-blue-800',
    operator: 'bg-emerald-100 border-emerald-800 text-emerald-800',
    guru: 'bg-amber-100 border-amber-800 text-amber-800',
  }

  const userRole = isSuper ? 'super_admin' : (activeUnit?.role ?? 'operator')
  const roleLabel = ROLE_LABELS[userRole] || userRole
  const roleColor = ROLE_COLORS[userRole] || 'bg-emerald-100 border-emerald-800 text-emerald-800'
  const yayasanRoutePrefixes = ['/dashboard', '/laporan-keuangan', '/bank', '/hutang-piutang', '/penggajian', '/penggajian_pegawai', '/dana', '/pegawai', '/aset', '/beasiswa', '/anggaran']
  const systemRoutes = new Set(['/user', '/role', '/unit', '/vendor', '/kategori', '/coa', '/general'])
  const isYayasanRoute = yayasanRoutePrefixes.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))
  const isSystemRoute = systemRoutes.has(location.pathname)
  const YAYASAN_NAV = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin_yayasan'] },
      ],
    },
    {
      label: 'Laporan',
      items: [
        { name: 'Lap. Keuangan', to: '/laporan-keuangan', icon: BarChart3, roles: ['super_admin', 'admin_yayasan'] },
      ],
    },
    {
      label: 'Master Data',
      items: [
        { name: 'Bank', to: '/bank', icon: Landmark, roles: ['super_admin', 'admin_yayasan'] },
        { name: 'Pegawai', to: '/pegawai', icon: Briefcase, roles: ['super_admin', 'admin_yayasan'] },
        { name: 'Aset Tetap', to: '/aset', icon: Building2, roles: ['super_admin', 'admin_yayasan'] },
        { name: 'Beasiswa', to: '/beasiswa', icon: Award, roles: ['super_admin', 'admin_yayasan'] },
      ],
    },
    {
      label: 'Transaksi',
      items: [
        { name: 'Hutang Piutang', to: '/hutang-piutang', icon: Banknote, roles: ['super_admin', 'admin_yayasan'] },
        { name: 'Penggajian', to: '/penggajian', icon: DollarSign, roles: ['super_admin', 'admin_yayasan'] },
        { name: 'Dana', to: '/dana', icon: HandHeart, roles: ['super_admin', 'admin_yayasan'] },
        { name: 'Anggaran', to: '/anggaran', icon: Target, roles: ['super_admin', 'admin_yayasan'] },
      ],
    },
  ]

  const SYSTEM_NAV = [
    {
      label: 'System',
      items: [
        { name: 'General', to: '/general', icon: Settings, roles: ['super_admin', 'admin_yayasan'] },
        { name: 'Pengguna', to: '/user', icon: UserCog, roles: ['super_admin'] },
        { name: 'Hak Akses', to: '/role', icon: Shield, roles: ['super_admin'] },
        { name: 'Unit', to: '/unit', icon: Building2, roles: ['super_admin'] },
        { name: 'Vendor', to: '/vendor', icon: Building2, roles: ['super_admin'] },
        { name: 'Kategori', to: '/kategori', icon: Tag, roles: ['super_admin'] },
        { name: 'Chart of Accounts', to: '/coa', icon: BookOpen, roles: ['super_admin'] },
      ],
    },
  ]

  const SEKOLAH_NAV = [
    {
      label: 'Akademik',
      items: [
        { name: 'Data Siswa', to: '/siswa', icon: Users, roles: ['super_admin', 'admin_yayasan', 'operator', 'guru'] },
        { name: 'Kelas', to: '/kelas', icon: GraduationCap, roles: ['super_admin', 'admin_yayasan', 'operator', 'guru'] },
        { name: 'Tingkat', to: '/tingkat', icon: Layers, roles: ['super_admin', 'admin_yayasan', 'operator', 'guru'] },
        { name: 'Tahun Ajaran', to: '/tahun-ajaran', icon: Calendar, roles: ['super_admin', 'admin_yayasan'] },
        { name: 'Kurikulum', to: '/kurikulum', icon: BookOpen, roles: ['super_admin', 'admin_yayasan'] },
      ],
    },
    {
      label: 'Keuangan',
      items: [
        { name: 'SPP / Tagihan', to: '/spp', icon: CreditCard, roles: ['super_admin', 'admin_yayasan', 'operator'] },
        { name: 'Tagihan Lainnya', to: '/tagihan', icon: Receipt, roles: ['super_admin', 'admin_yayasan', 'operator'] },
        { name: 'Kas', to: '/keuangan', icon: Wallet, roles: ['super_admin', 'admin_yayasan', 'operator'] },
        { name: 'BOS', to: '/bos', icon: GraduationCap, roles: ['super_admin', 'admin_yayasan'] },
      ],
    },
    {
      label: 'Pengaturan',
      items: [
        { name: 'Aplikasi', to: '/pengaturan', icon: Settings, roles: ['admin_yayasan', 'operator'] },
      ],
    },
  ]

  const navigation = YAYASAN_NAV
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(userRole as any)),
    }))
    .filter((group) => group.items.length > 0)

  const sekolahNav = SEKOLAH_NAV
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(userRole as any)),
    }))
    .filter((group) => group.items.length > 0)

  const systemNav = SYSTEM_NAV
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(userRole as any)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Backdrop overlay — mobile only */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-nb-ink/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-72 md:w-64
        border-r-2 border-nb-ink bg-sidebar flex flex-col
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand/Logo + close (mobile) — fixed, not scrolling */}
        <div className="flex items-center justify-between p-4 border-b-2 border-nb-ink shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent border-2 border-nb-ink rounded flex items-center justify-center font-bold text-lg shrink-0">
              AN
            </div>
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-sm leading-tight text-foreground truncate">Annahl Foundation</h1>
              <span className="text-sm text-muted-foreground font-sans">Management System</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 hover:bg-muted-foreground/10 rounded cursor-pointer"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Navigation — scrollable */}
        <nav className="overflow-y-auto flex-1 min-h-0 space-y-1">
          {/* Yayasan Section — Accordion */}
          {navigation.length > 0 && (
            <div className="overflow-hidden">
              <button
                onClick={() => setOpenSection(prev => prev === 'yayasan' ? null : 'yayasan')}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/30 cursor-pointer text-left border-b border-transparent"
              >
                <span className="flex items-center gap-1.5 text-sm font-heading font-bold text-nb-ink uppercase tracking-[0.15em]">
                  <Building2 className="w-3.5 h-3.5" /> YAYASAN
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-nb-ink transition-transform duration-200 ${openSection === 'yayasan' ? 'rotate-0' : '-rotate-90'}`} />
              </button>
              <div className={`nb-accordion-content ${openSection === 'yayasan' ? 'open' : ''}`}>
                <div className="nb-accordion-inner">
                  <div className="border-t border-nb-ink/20 py-1">
                    {navigation.map((group, gIdx) => (
                      <div key={group.label} className={gIdx > 0 ? 'border-t border-nb-ink/15' : ''}>
                        <span className="block text-[11px] font-heading font-bold text-muted-foreground uppercase tracking-[0.12em] px-3 pt-2 pb-1">
                          {group.label}
                        </span>
                        <div className="px-1.5 pb-1 space-y-0.5">
                          {group.items.map((item) => (
                            <Link
                              key={item.name}
                              to={item.to}
                              onClick={() => setSidebarOpen(false)}
                              className="nb-sidebar-item !py-1.5 !px-2 !text-[13px]"
                              activeProps={{ className: 'active' }}
                            >
                              <item.icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sekolah Section — Accordion */}
          {sekolahNav.length > 0 && (
            <div className="overflow-hidden">
              <button
                onClick={() => setOpenSection(prev => prev === 'sekolah' ? null : 'sekolah')}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/30 cursor-pointer text-left border-b border-transparent"
              >
                <span className="flex items-center gap-1.5 text-sm font-heading font-bold text-nb-ink uppercase tracking-[0.15em]">
                  <GraduationCap className="w-3.5 h-3.5" /> SEKOLAH
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-nb-ink transition-transform duration-200 ${openSection === 'sekolah' ? 'rotate-0' : '-rotate-90'}`} />
              </button>
              <div className={`nb-accordion-content ${openSection === 'sekolah' ? 'open' : ''}`}>
                <div className="nb-accordion-inner">
                  <div className="border-t border-nb-ink/20">
                    {/* Sekolah Sub-groups */}
                    <div className="py-1">
                      {sekolahNav.map((group, gIdx) => (
                        <div key={group.label} className={gIdx > 0 ? 'border-t border-nb-ink/15' : ''}>
                          <span className="block text-[11px] font-heading font-bold text-muted-foreground uppercase tracking-[0.12em] px-3 pt-2 pb-1">
                            {group.label}
                          </span>
                          <div className="px-1.5 pb-1 space-y-0.5">
                            {group.items.map((item) => (
                              <Link
                                key={item.name}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                className="nb-sidebar-item !py-1.5 !px-2 !text-[13px]"
                                activeProps={{ className: 'active' }}
                              >
                                <item.icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{item.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Section — Accordion */}
          {systemNav.length > 0 && (
            <div className="overflow-hidden">
              <button
                onClick={() => setOpenSection(prev => prev === 'system' ? null : 'system')}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/30 cursor-pointer text-left border-b border-transparent"
              >
                <span className="flex items-center gap-1.5 text-sm font-heading font-bold text-nb-ink uppercase tracking-[0.15em]">
                  <Settings className="w-3.5 h-3.5" /> SYSTEM
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-nb-ink transition-transform duration-200 ${openSection === 'system' ? 'rotate-0' : '-rotate-90'}`} />
              </button>
              <div className={`nb-accordion-content ${openSection === 'system' ? 'open' : ''}`}>
                <div className="nb-accordion-inner">
                  <div className="border-t border-nb-ink/20">
                    <div className="py-1">
                      {systemNav.map((group, gIdx) => (
                        <div key={group.label} className={gIdx > 0 ? 'border-t border-nb-ink/15' : ''}>
                          <span className="block text-[11px] font-heading font-bold text-muted-foreground uppercase tracking-[0.12em] px-3 pt-2 pb-1">
                            {group.label}
                          </span>
                          <div className="px-1.5 pb-1 space-y-0.5">
                            {group.items.map((item) => (
                              <Link
                                key={item.name}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                className="nb-sidebar-item !py-1.5 !px-2 !text-[13px]"
                                activeProps={{ className: 'active' }}
                              >
                                <item.icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{item.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Header bar */}
        <header className="h-14 md:h-16 border-b-2 border-nb-ink bg-card flex items-center justify-between px-4 md:px-6 shrink-0 gap-2">
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 -ml-1 hover:bg-muted-foreground/10 rounded cursor-pointer"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            {isYayasanRoute ? (
              <>
                <span className="text-sm md:text-sm uppercase bg-secondary border-2 border-nb-ink px-2 md:px-2.5 py-1 rounded font-heading font-semibold shadow-sm shrink-0">
                  YAYASAN
                </span>
                <Combobox
                  options={[{ value: 'all', label: 'Semua Unit' }, ...units.map((u: any) => ({ value: u.id, label: `${u.nama} (${u.jenjang})` }))]}
                  value={yayasanFilterUnitId}
                  onValueChange={setYayasanFilterUnitId}
                  triggerClassName="text-sm border-2 border-nb-ink rounded h-8 px-2"
                  className="min-w-[160px]"
                />
              </>
            ) : isSystemRoute ? (
              <span className="text-sm md:text-sm uppercase bg-muted border-2 border-nb-ink px-2 md:px-2.5 py-1 rounded font-heading font-semibold shadow-sm shrink-0">
                SYSTEM
              </span>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUnitOpen(!unitOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-card border-2 border-nb-ink rounded font-heading font-semibold text-sm text-foreground hover:bg-muted-foreground/10 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate max-w-[180px]">{activeUnit?.nama ?? 'Pilih Unit'}</span>
                  <ChevronDown className="w-3 h-3 text-nb-ink shrink-0" />
                </button>
                {unitOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-card border-2 border-nb-ink rounded shadow-lg z-50 min-w-[240px] max-h-48 overflow-y-auto">
                    {units.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => {
                          setActiveUnitId(unit.id)
                          setUnitOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm font-heading font-semibold hover:bg-secondary/40 border-b border-nb-ink last:border-b-0 flex items-center justify-between ${
                          activeUnit?.id === unit.id ? 'bg-secondary/70 text-foreground' : 'text-nb-ink-soft'
                        }`}
                      >
                        <span className="truncate">{unit.nama}</span>
                        <span className="text-[11px] uppercase bg-accent/40 border border-nb-ink/30 px-1 rounded-sm shrink-0 ml-2">
                          {unit.jenjang}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-sm uppercase font-heading font-semibold border px-2 py-0.5 rounded-full ${roleColor}`}>
              {roleLabel}
            </span>
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 bg-accent border-2 border-nb-ink rounded flex items-center justify-center font-heading font-bold text-sm text-foreground hover:bg-muted-foreground/10 cursor-pointer"
                title="Profil"
              >
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 bg-card border-2 border-nb-ink rounded z-50 min-w-[180px]">
                  <div className="px-3 py-2.5 border-b-2 border-nb-ink bg-secondary/40">
                    <p className="font-heading font-bold text-sm text-foreground truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout() }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-heading font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Keluar Sesi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content wrapper */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          {isLoading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 md:w-1/4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="h-28 md:h-32 bg-muted rounded border-2 border-nb-ink" />
                <div className="h-28 md:h-32 bg-muted rounded border-2 border-nb-ink" />
                <div className="h-28 md:h-32 bg-muted rounded border-2 border-nb-ink" />
              </div>
              <div className="h-48 md:h-64 bg-muted rounded border-2 border-nb-ink" />
            </div>
          ) : isYayasanRoute || isSystemRoute ? (
            <Outlet />
          ) : !activeUnit ? (
            <div className="nb-card max-w-md mx-auto text-center mt-12 bg-amber-50">
              <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="font-heading font-bold text-lg mb-2">Akses Unit Diperlukan</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Pilih unit sekolah terlebih dahulu dari panel navigasi Sekolah.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  )
}
