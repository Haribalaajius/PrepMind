// src/app/(dashboard)/practice/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { getWeakTopics, getTestHistory } from '@/lib/db/queries'
import PracticePageClient from '@/components/practice/PracticePageClient'
export default async function PracticePage() {
  const user = await getAuthUser(); if (!user) redirect('/login')
  const [weakTopics, testHistory] = await Promise.all([getWeakTopics(user.id), getTestHistory(user.id)])
  return <PracticePageClient userId={user.id} weakTopics={weakTopics} testHistory={testHistory}/>
}
