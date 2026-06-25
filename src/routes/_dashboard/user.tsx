import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, canManageUsers } from '#/server/auth'
import {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
} from '#/server/user'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Key,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Star,
  ShieldCheck,

} from 'lucide-react'

export const Route = createFileRoute('/_dashboard/user')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const canManage = await canManageUsers()
    if (!canManage) throw redirect({ to: '/siswa' })
  },
  component: UserPage,
})

function formatDate(date: Date | string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function UserPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', isSuperAdmin: false })
  const [createError, setCreateError] = useState('')

  const [editUser, setEditUser] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '' })
  const [editError, setEditError] = useState('')

  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [resetPasswordVal, setResetPasswordVal] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{message: string; onConfirm: () => void} | null>(null)

  const fetchUsers = () => {
    setLoading(true)
    getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const totalPages = Math.ceil(users.length / pageSize)
  const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    try {
      await createUser({ data: createForm })
      setIsCreateModalOpen(false)
      setCreateForm({ name: '', email: '', password: '', isSuperAdmin: false })
      fetchUsers()
    } catch (err: any) {
      setCreateError(err.message || 'Gagal membuat user')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setEditError('')
    try {
      await updateUser({ data: { userId: editUser.id, ...editForm } })
      setEditUser(null)
      fetchUsers()
    } catch (err: any) {
      setEditError(err.message || 'Gagal mengupdate user')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetUserId) return
    setResetError('')
    setResetSuccess('')
    try {
      await resetPassword({ data: { userId: resetUserId, newPassword: resetPasswordVal } })
      setResetSuccess('Password berhasil direset!')
      setTimeout(() => {
        setResetUserId(null)
        setResetPasswordVal('')
        setResetSuccess('')
      }, 2000)
    } catch (err: any) {
      setResetError(err.message || 'Gagal mereset password')
    }
  }

  const handleDelete = (userId: string) => {
    setConfirmDelete({
      message: 'Yakin ingin menghapus user ini? Tindakan ini tidak bisa dibatalkan.',
      onConfirm: async () => {
        try {
          await deleteUser({ data: { userId } })
          fetchUsers()
          setConfirmDelete(null)
        } catch (err: any) {
          alert(err.message || 'Gagal menghapus user')
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola akun pengguna sistem yayasan.
          </p>
        </div>
      </div>

      {/* Summary + Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="nb-stat-card bg-[#FFFDF5] [--accent-bar:var(--nb-sage)] mb-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 border-2 border-nb-ink rounded shadow-sm">
              <Users className="w-5 h-5 text-blue-800" />
            </div>
            <div>
              <span className="text-sm font-heading font-semibold text-muted-foreground uppercase">
                TOTAL USER
              </span>
              <h3 className="font-heading font-bold text-xl mt-0.5">{users.length} User</h3>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setCreateForm({ name: '', email: '', password: '', isSuperAdmin: false })
            setCreateError('')
            setIsCreateModalOpen(true)
          }}
          className="nb-btn nb-btn-primary text-sm cursor-pointer w-full sm:w-auto justify-center"
        >
          <UserPlus className="w-4 h-4" /> Tambah User Baru
        </button>
      </div>

      {/* Users Table */}
      <div className="nb-table-wrapper bg-card">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded border-2 border-nb-ink" />
            ))}
          </div>
        ) : (
          <>
            <table className="nb-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th className="hidden md:table-cell">Tgl Dibuat</th>
                    <th className="w-[120px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-accent border-2 border-nb-ink flex items-center justify-center font-heading font-bold text-sm shrink-0">
                            {u.name ? u.name[0].toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-bold text-sm text-foreground truncate">{u.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {u.isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold bg-purple-100 border border-purple-800 text-purple-800 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3" /> Super Admin
                          </span>
                        ) : (
                          <span className="text-sm font-heading font-semibold text-muted-foreground">Regular</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditUser(u)
                              setEditForm({ name: u.name, email: u.email })
                              setEditError('')
                            }}
                            className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
                            title="Edit user"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setResetUserId(u.id)
                              setResetPasswordVal('')
                              setResetError('')
                              setResetSuccess('')
                            }}
                            className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
                            title="Reset password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-rose-100 cursor-pointer"
                            title="Hapus user"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                        Belum ada user
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

            {totalPages > 1 && (
              <div className="p-4 border-t-2 border-nb-ink flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{users.length} user total</span>
                <div className="flex items-center gap-2">
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
                      className={`px-2.5 py-1 border-2 border-nb-ink rounded text-sm font-heading font-bold cursor-pointer ${
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

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-md md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Tambah User Baru</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {createError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{createError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Lengkap</label>
                <input type="text" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="nb-input" placeholder="e.g. Ahmad Fauzi" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Alamat Email</label>
                <input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="nb-input" placeholder="user@annahl.sch.id" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Password</label>
                <input type="text" required value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="nb-input" placeholder="Min. 6 karakter" minLength={6} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isSuperAdmin"
                  checked={createForm.isSuperAdmin}
                  onChange={(e) => setCreateForm({ ...createForm, isSuperAdmin: e.target.checked })}
                  className="w-4 h-4 border-2 border-nb-ink rounded accent-secondary"
                />
                <label htmlFor="isSuperAdmin" className="text-sm font-heading font-semibold cursor-pointer">Jadikan Super Admin</label>
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Buat User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-md md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Edit User</h3>
              <button onClick={() => setEditUser(null)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-4 md:p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{editError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Lengkap</label>
                <input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Alamat Email</label>
                <input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="nb-input" />
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setEditUser(null)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Reset Password</h3>
              <button onClick={() => { setResetUserId(null); setResetSuccess('') }} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-4 md:p-6 space-y-4">
              {resetError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{resetError}</span>
                </div>
              )}
              {resetSuccess && (
                <div className="p-3 bg-emerald-100 border-2 border-emerald-800 text-emerald-800 text-sm font-semibold rounded flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" /> <span>{resetSuccess}</span>
                </div>
              )}
              {!resetSuccess && (
                <>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Password Baru</label>
                    <input type="text" required value={resetPasswordVal} onChange={(e) => setResetPasswordVal(e.target.value)} className="nb-input" placeholder="Min. 6 karakter" minLength={6} />
                  </div>
                  <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button type="button" onClick={() => { setResetUserId(null); setResetSuccess('') }} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                    <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Reset Password</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) confirmDelete.onConfirm() }}
        message={confirmDelete?.message || ''}
      />
    </div>
  )
}
