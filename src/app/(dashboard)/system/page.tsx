// src/app/(dashboard)/system/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { getProfile, getSettings } from '@/lib/db/queries'
import SystemPageClient from '@/components/dashboard/SystemPageClient'
export default async function SystemPage() {
  const user = await getAuthUser(); if (!user) redirect('/login')
  const [profile, settings] = await Promise.all([getProfile(user.id), getSettings(user.id)])
  return <SystemPageClient userId={user.id} email={user.email??''} profile={profile} settings={settings} alreadyMigrated={!!profile?.migrated_at}/>
}
