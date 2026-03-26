// src/app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { getDashboardSummary, getWeakTopics, getRevisionQueue, getTestHistory, getTopicMasteryList } from '@/lib/db/queries'
import CommandPanel from '@/components/dashboard/CommandPanel'

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [summary, weakTopics, revQueue, testHistory, masteryList] = await Promise.all([
    getDashboardSummary(user.id),
    getWeakTopics(user.id, 'active'),
    getRevisionQueue(user.id),
    getTestHistory(user.id, 5),
    getTopicMasteryList(user.id),
  ])

  return (
    <CommandPanel
      userId={user.id}
      summary={summary}
      weakTopics={weakTopics}
      revisionQueue={revQueue}
      testHistory={testHistory}
      masteryList={masteryList}
    />
  )
}
