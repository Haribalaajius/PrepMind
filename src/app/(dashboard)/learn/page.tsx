// src/app/(dashboard)/learn/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { getFormulas, getRevisionQueue } from '@/lib/db/queries'
import LearnPageClient from '@/components/practice/LearnPageClient'
export default async function LearnPage() {
  const user = await getAuthUser(); if (!user) redirect('/login')
  const [formulas, revQueue] = await Promise.all([getFormulas(user.id), getRevisionQueue(user.id)])
  return <LearnPageClient userId={user.id} formulas={formulas} revQueue={revQueue}/>
}
