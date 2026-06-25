import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, canManageUsers } from '#/server/auth'
import {
  getAllUsers,
  getAllUnits,
  assignUserToUnit,
  updateUserUnitRole,
  removeUserFromUnit,
  toggleSuperAdmin,
  toggleBendahara,
} from '#/server/role'
import { useState, useEffect, useMemo } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  Shield, UserPlus, X, ChevronLeft, ChevronRight, AlertCircle, Star, Search,
} from 'lucide-react'
import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/role')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const canManage = await canManageUsers()
    if (!canManage) throw redirect({ to: '/siswa' })
  },
  component: RolePage,
})

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_yayasan: 'Admin Yayasan',
  operator: 'Operator',
  guru: 'Guru',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-800',
  admin_yayasan: 'bg-blue-100 text-blue-800 border-blue-800',
  operator: 'bg-emerald-100 text-emerald-800 border-emerald-800',
  guru: 'bg-amber-100 text-amber-800 border-amber-800',
}

const ALL_ROLES = ['super_admin', 'admin_yayasan', 'operator', 'guru'] as const

function RoleSelector({ value, onChange }: { value: string; onChange: (v: typeof ALL_ROLES[number]) => void }) {
  return (
    <div className="flex gap-2">
      {ALL_ROLES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`flex-1 nb-btn font-heading font-bold text-[11px] py-2 cursor-pointer ${
            value === r ? 'bg-secondary shadow-none translate-y-0.5' : 'bg-card'
          }`}
        >
          {ROLE_LABELS[r]}
        </button>
      ))}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded font-heading font-bold border ${ROLE_COLORS[role] || ''}`}>
      {ROLE_LABELS[role] || role}
    </span>
  )
}

function RolePage() {
  const [users, setUsers] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignUserId, setAssignUserId] = useState<string | null>(null)
  const [assignUnitId, setAssignUnitId] = useState('')
  const [assignRole, setAssignRole] = useState<'super_admin' | 'admin_yayasan' | 'operator' | 'guru'>('operator')
  const [assignIsBendahara, setAssignIsBendahara] = useState(false)
  const [assignError, setAssignError] = useState('')

  const [editAssignmentId, setEditAssignmentId] = useState<string | null>(null)
  const [editUnitName, setEditUnitName] = useState('')
  const [editCurrentRole, setEditCurrentRole] = useState('')
  const [editRole, setEditRole] = useState<'super_admin' | 'admin_yayasan' | 'operator' | 'guru'>('operator')
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{message: string; onConfirm: () => void} | null>(null)

  const fetchData = () => {
    setLoading(true)
    setFetchError('')
    Promise.all([getAllUsers(), getAllUnits()])
      .then(([usersData, unitsData]) => {
        setUsers(Array.isArray(usersData) ? usersData : [])
        setUnits(Array.isArray(unitsData) ? unitsData : [])
      })
      .catch((err: any) => {
        setFetchError(err.message || 'Gagal memuat data')
        console.error('Role page fetch error:', err)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const q = searchQuery.toLowerCase()
    return users.filter((u) => (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    ))
  }, [users, searchQuery])

  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize)

  const superAdminCount = users.filter((u) => u.isSuperAdmin).length

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setAssignError('')
    if (!assignUserId || !assignUnitId) {
      setAssignError('Pilih unit')
      return
    }
    try {
      await assignUserToUnit({ data: { userId: assignUserId, unitId: assignUnitId, role: assignRole, isBendahara: assignIsBendahara } })
      setIsAssignModalOpen(false)
      setAssignUserId(null)
      setAssignUnitId('')
      setAssignRole('operator')
      fetchData()
    } catch (err: any) {
      setAssignError(err.message || 'Gagal memberikan akses')
    }
  }

  const handleUpdateRole = async () => {
    if (!editAssignmentId) return
    setEditError('')
    try {
      await updateUserUnitRole({ data: { assignmentId: editAssignmentId, role: editRole } })
      setEditAssignmentId(null)
      fetchData()
    } catch (err: any) {
      setEditError(err.message || 'Gagal mengubah role')
    }
  }

  const handleToggleSuperAdmin = async (userId: string) => {
    try {
      await toggleSuperAdmin({ data: { userId } })
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status Super Admin')
    }
  }

  const assignUser = users.find((u) => u.id === assignUserId)

  const assignedUnitIds = assignUser?.assignments?.map((a: any) => a.unitId) || []
  const availableUnits = units.filter((u) => !assignedUnitIds.includes(u.id))

  return (
    <div className="space-y-4">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Hak Akses</h2>
        </div>
      </div>

      {fetchError && (
        <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> <span>{fetchError}</span>
          <button onClick={fetchData} className="ml-auto text-sm underline font-bold cursor-pointer">Coba Lagi</button>
        </div>
      )}

      <div className="nb-table-wrapper bg-card">
        <div className="p-3 border-b-2 border-nb-ink flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider">
              {filteredUsers.length} Pengguna · {units.length} Unit
              {superAdminCount > 0 && (
                <span className="ml-2 text-sm normal-case font-normal tracking-normal text-muted-foreground">
                  · {superAdminCount} <Star className="w-2.5 h-2.5 inline text-purple-600" /> Super Admin
                </span>
              )}
            </h3>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari pengguna..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              className="nb-input pl-8 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded border-2 border-nb-ink" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Akses Unit & Role</th>
                    <th className="w-[80px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-accent border-2 border-nb-ink flex items-center justify-center font-heading font-bold text-sm shrink-0">
                            {user.name ? user.name[0].toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-bold text-sm truncate">
                              {user.name}
                              {user.isSuperAdmin && (
                                <Star className="w-3 h-3 inline ml-1 text-purple-600 fill-purple-600" />
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {user.isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold text-purple-600">
                            <Shield className="w-3 h-3" />
                            Akses Penuh — Semua Unit
                          </span>
                        ) : user.assignments.length === 0 ? (
                          <span className="text-sm text-muted-foreground italic">Belum punya akses</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {user.assignments.map((a: any) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-0.5 text-sm font-heading font-semibold border border-nb-ink rounded bg-card"
                              >
                                <button
                                  onClick={() => {
                                    setEditAssignmentId(a.id)
                                    setEditUnitName(a.unitNama)
                                    setEditCurrentRole(a.role)
                                    setEditRole(a.role)
                                    setEditError('')
                                  }}
                                  className="px-1.5 py-0.5 hover:bg-muted-foreground/10 cursor-pointer"
                                  title="Klik untuk ubah role"
                                >
                                  {a.unitNama}
                                  <span className={`ml-1 text-[8px] uppercase px-1 py-0.5 rounded-sm font-bold ${ROLE_COLORS[a.role] || ''}`}>
                                    {ROLE_LABELS[a.role] || a.role}
                                  </span>
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await toggleBendahara({ data: { assignmentId: a.id } })
                                      fetchData()
                                    } catch (err: any) {
                                      alert(err.message)
                                    }
                                  }}
                                  className={`px-1 py-0.5 cursor-pointer ${
                                    a.isBendahara
                                      ? 'bg-amber-200 text-amber-800 hover:bg-amber-300'
                                      : 'hover:bg-muted-foreground/10 text-muted-foreground'
                                  }`}
                                  title={a.isBendahara ? 'Cabut Bendahara' : 'Jadikan Bendahara'}
                                >
                                  <span className="text-[8px] uppercase font-bold">
                                    {a.isBendahara ? 'Bendahara' : 'B'}
                                  </span>
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({
                                    message: `Hapus akses ${user.name} dari ${a.unitNama}?`,
                                    onConfirm: async () => {
                                      try {
                                        await removeUserFromUnit({ data: { assignmentId: a.id } })
                                        fetchData()
                                        setConfirmDelete(null)
                                      } catch (err: any) {
                                        alert(err.message)
                                      }
                                    },
                                  })}
                                  className="pr-1.5 py-0.5 hover:text-rose-600 cursor-pointer"
                                  title="Hapus akses"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleSuperAdmin(user.id)}
                            className={`p-1.5 border-2 border-nb-ink rounded cursor-pointer ${
                              user.isSuperAdmin
                                ? 'bg-purple-200 hover:bg-purple-300'
                                : 'bg-card hover:bg-muted-foreground/10'
                            }`}
                            title={user.isSuperAdmin ? 'Cabut Super Admin' : 'Jadikan Super Admin'}
                          >
                            <Star className={`w-3.5 h-3.5 ${user.isSuperAdmin ? 'text-purple-800 fill-purple-800' : ''}`} />
                          </button>
                          <button
                            onClick={() => {
                              setAssignUserId(user.id)
                              setAssignUnitId('')
                              setAssignRole('operator')
                              setAssignIsBendahara(false)
                              setAssignError('')
                              setIsAssignModalOpen(true)
                            }}
                            className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
                            title="Tambah akses unit"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-10">
                        <p className="text-sm text-muted-foreground">
                          {searchQuery ? 'Tidak ada pengguna yang cocok' : 'Belum ada pengguna'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-3 border-t-2 border-nb-ink flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {filteredUsers.length} dari {users.length} pengguna
                  {searchQuery && <button onClick={() => { setSearchQuery(''); setPage(1) }} className="ml-2 underline hover:text-foreground cursor-pointer">Reset</button>}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="nb-btn nb-btn-secondary px-2 py-1 text-sm disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-2 py-1 border-2 border-nb-ink rounded text-sm font-heading font-bold cursor-pointer ${
                        p === page ? 'bg-secondary shadow-none translate-y-0.5' : 'bg-card hover:bg-muted-foreground/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="nb-btn nb-btn-secondary px-2 py-1 text-sm disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Assign Access Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg max-h-[85dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Akses Unit — {assignUser?.name}</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {assignError && (
                <div className="p-2.5 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{assignError}</span>
                </div>
              )}

              {/* Existing Assignments */}
              {assignUser && !assignUser.isSuperAdmin && assignUser.assignments?.length > 0 && (
                <div>
                  <label className="block text-sm font-heading font-bold mb-2 uppercase tracking-wider text-muted-foreground">
                    Akses Saat Ini ({assignUser.assignments.length})
                  </label>
                  <div className="space-y-1">
                    {assignUser.assignments.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between bg-muted/20 border-2 border-nb-ink rounded px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-sm">{a.unitNama}</span>
                          <RoleBadge role={a.role} />
                          {a.isBendahara && (
                            <span className="text-[8px] uppercase px-1 py-0.5 rounded-sm font-bold bg-amber-200 text-amber-800 border border-amber-800">
                              Bendahara
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setConfirmDelete({
                            message: `Hapus akses ${assignUser.name} dari ${a.unitNama}?`,
                            onConfirm: async () => {
                              try {
                                await removeUserFromUnit({ data: { assignmentId: a.id } })
                                fetchData()
                                setConfirmDelete(null)
                              } catch (err: any) {
                                alert(err.message)
                              }
                            },
                          })}
                          className="p-1 hover:bg-rose-100 rounded cursor-pointer"
                          title="Hapus akses"
                        >
                          <X className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {assignUser?.isSuperAdmin && (
                <div className="bg-purple-50/50 border-2 border-purple-800 border-dashed rounded p-3 text-sm">
                  <span className="font-heading font-bold text-purple-800 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-purple-800 text-purple-800" />
                    Super Admin — Akses penuh ke semua unit
                  </span>
                </div>
              )}

              {/* Divider */}
              {assignUser && !assignUser.isSuperAdmin && assignUser.assignments?.length > 0 && (
                <div className="border-t-2 border-nb-ink" />
              )}

              {/* Add New Access */}
              <form onSubmit={handleAssign} className="space-y-3">
                {!assignUser?.isSuperAdmin && (
                  <>
                    <div>
                      <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tambah Akses Baru</label>
                    </div>
                    <div>
                      <label className="block text-sm font-heading font-bold mb-1">Unit</label>
                      <Combobox
                        options={[{value: '', label: 'Pilih Unit...'}, ...availableUnits.map((u) => ({value: u.id, label: `${u.nama} (${u.jenjang})`}))]}
                        value={assignUnitId}
                        onValueChange={setAssignUnitId}
                        triggerClassName="nb-input text-sm"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-heading font-bold mb-1">Role</label>
                      <RoleSelector value={assignRole} onChange={setAssignRole} />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                      <input type="checkbox" checked={assignIsBendahara} onChange={(e) => setAssignIsBendahara(e.target.checked)}
                        className="w-4 h-4 border-2 border-nb-ink rounded" />
                      <span className="text-sm font-heading font-bold">Jadikan Bendahara</span>
                      <span className="text-sm text-muted-foreground">— dapat menyetujui penggajian</span>
                    </label>
                  </>
                )}

                <div className="border-t-2 border-nb-ink pt-3 flex flex-col-reverse sm:flex-row justify-end gap-3">
                  {!assignUser?.isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(false)}
                      className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center text-sm"
                    >
                      Batal
                    </button>
                  )}
                  {assignUser?.isSuperAdmin ? (
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(false)}
                      className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center text-sm"
                    >
                      Tutup
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center text-sm"
                    >
                      Simpan
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editAssignmentId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Ubah Role</h3>
              <button
                onClick={() => setEditAssignmentId(null)}
                className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {editError && (
                <div className="p-2.5 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="bg-muted/30 border-2 border-nb-ink rounded p-2 text-sm flex items-center gap-2">
                <span className="font-heading font-bold">{editUnitName}</span>
                <RoleBadge role={editCurrentRole} />
              </div>

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Role Baru</label>
                <RoleSelector value={editRole} onChange={setEditRole} />
              </div>

              <div className="border-t-2 border-nb-ink pt-3 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditAssignmentId(null)}
                  className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center text-sm"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete?.onConfirm()}
        message={confirmDelete?.message || ''}
      />
    </div>
  )
}