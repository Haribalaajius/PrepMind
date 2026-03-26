// src/app/(dashboard)/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { getDashboardSummary } from '@/lib/db/queries'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const summary = await getDashboardSummary(user.id)

  return (
    <DashboardShell
      userId={user.id}
      email={user.email ?? ''}
      summary={summary}
    >
      {children}
    </DashboardShell>
  )
}
