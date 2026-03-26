// src/app/(dashboard)/revise/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { getRevisionQueue, getWeakTopics, getStudyLogs, getDailyPlanWithTasks } from '@/lib/db/queries'
import RevisePageClient from '@/components/revision/RevisePageClient'
export default async function RevisePage() {
  const user = await getAuthUser(); if (!user) redirect('/login')
  const today = new Date().toISOString().split('T')[0]
  const [revQueue, weakTopics, studyLogs, planData] = await Promise.all([
    getRevisionQueue(user.id), getWeakTopics(user.id), getStudyLogs(user.id, 7), getDailyPlanWithTasks(user.id, today)
  ])
  return <RevisePageClient userId={user.id} revQueue={revQueue} weakTopics={weakTopics} studyLogs={studyLogs} todayPlan={planData.plan} todayTasks={planData.tasks}/>
}
