// src/app/(dashboard)/doubts/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { getWeakTopics } from '@/lib/db/queries'
import DoubtsPageClient from '@/components/practice/DoubtsPageClient'
export default async function DoubtsPage() {
  const user = await getAuthUser(); if (!user) redirect('/login')
  const weakTopics = await getWeakTopics(user.id)
  return <DoubtsPageClient userId={user.id} weakTopics={weakTopics.map(w=>w.topic)}/>
}
