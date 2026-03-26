// src/app/(dashboard)/analyze/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { getMistakes, getTopicMasteryList, getAnalyticsSummary, getWeakTopics, getTestHistory } from '@/lib/db/queries'
import AnalyzePageClient from '@/components/analytics/AnalyzePageClient'
export default async function AnalyzePage() {
  const user = await getAuthUser(); if (!user) redirect('/login')
  const [mistakes, mastery, analytics, weakTopics, testHistory] = await Promise.all([
    getMistakes(user.id), getTopicMasteryList(user.id), getAnalyticsSummary(user.id), getWeakTopics(user.id), getTestHistory(user.id)
  ])
  return <AnalyzePageClient userId={user.id} mistakes={mistakes} mastery={mastery} analytics={analytics} weakTopics={weakTopics} testHistory={testHistory}/>
}
