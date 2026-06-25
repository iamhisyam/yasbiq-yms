import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession } from '#/server/auth'

export const Route = createFileRoute('/_dashboard/penggajian_pegawai_/$id')({
  beforeLoad: async ({ params }) => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    throw redirect({ to: '/pegawai/$id', params: { id: params.id } })
  },
})