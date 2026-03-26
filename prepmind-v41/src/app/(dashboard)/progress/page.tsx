// src/app/(dashboard)/progress/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { getAnalyticsSummary, getStudyLogs, getTestHistory, getWeakTopics } from '@/lib/db/queries'
import ProgressPageClient from '@/components/analytics/ProgressPageClient'
export default async function ProgressPage() {
  const user = await getAuthUser(); if (!user) redirect('/login')
  const [analytics, studyLogs, testHistory, weakTopics] = await Promise.all([
    getAnalyticsSummary(user.id), getStudyLogs(user.id, 90), getTestHistory(user.id), getWeakTopics(user.id)
  ])
  return <ProgressPageClient userId={user.id} analytics={analytics} studyLogs={studyLogs} testHistory={testHistory} weakTopics={weakTopics}/>
}
