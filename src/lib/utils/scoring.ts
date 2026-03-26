// src/lib/utils/scoring.ts
// ─── Mastery, ROI, and readiness heuristics ──────────────────────────────────

import type { DbTopicMastery } from '@/types/database'
import type { MasteryLabel, ReadinessResult, TopicROI } from '@/types/domain'
import { SYLLABUS } from './constants'

/**
 * Compute a mastery label from raw mastery row data.
 * Mirrors the SQL logic in fn_upsert_topic_mastery.
 */
export function getMasteryLabel(m: Pick<DbTopicMastery, 'attempts' | 'correct' | 'mastery_score'>): MasteryLabel {
  if (m.attempts === 0) return 'unseen'
  if (m.attempts < 5 && m.correct / m.attempts > 0.8) return 'overconfident_risk'
  if (m.mastery_score < 20) return 'started'
  if (m.mastery_score < 40) return 'fragile'
  if (m.mastery_score < 60) return 'improving'
  if (m.mastery_score < 78) return 'strong'
  return 'exam_ready'
}

export const MASTERY_COLOR: Record<MasteryLabel, string> = {
  unseen:             '#4a4a65',
  started:            '#5ab4ff',
  fragile:            '#ff5a5a',
  improving:          '#ffb85a',
  strong:             '#4dff94',
  exam_ready:         '#e8ff5a',
  overconfident_risk: '#b85aff',
}

/**
 * Compute ROI score for a topic.
 * Higher ROI = studying this topic gives the highest rank improvement per hour.
 */
export function computeTopicROI(
  topicName: string,
  subjectName: string,
  masteryScore: number
): number {
  const subj = SYLLABUS.find(s => s.name === subjectName)
  const td   = subj?.topics.find(t => t.name === topicName)
  if (!subj || !td) return 30   // fallback mid-range
  const mastery01 = masteryScore / 100
  const freq      = td.freq / 10
  const weight    = subj.weight / 15
  return Math.round(freq * weight * (1 - mastery01 * 0.7) * 100)
}

/**
 * Build sorted ROI list across all GATE EC topics.
 */
export function buildROIMap(
  masteryList: DbTopicMastery[]
): TopicROI[] {
  const masteryMap = new Map(
    masteryList.map(m => [`${m.subject}::${m.topic}`, m])
  )
  const items: TopicROI[] = []
  for (const subj of SYLLABUS) {
    for (const t of subj.topics) {
      const m = masteryMap.get(`${subj.name}::${t.name}`)
      const score = m?.mastery_score ?? 0
      items.push({
        subject:       subj.name,
        topic:         t.name,
        roi_score:     computeTopicROI(t.name, subj.name, score),
        mastery_score: score,
        mastery_label: getMasteryLabel(m ?? { attempts: 0, correct: 0, mastery_score: 0 }),
        gate_weight:   subj.weight,
        frequency:     t.freq,
      })
    }
  }
  return items.sort((a, b) => b.roi_score - a.roi_score)
}

/**
 * Compute readiness heuristic (0–100) from aggregated stats.
 */
export function computeReadiness(opts: {
  overallAccuracy:    number   // 0–100
  activeWeakTopics:   number
  masteredTopicCount: number
  totalTopicCount:    number
  totalTests:         number
}): ReadinessResult {
  const acc         = opts.overallAccuracy / 100
  const weakBurden  = Math.max(0, 1 - opts.activeWeakTopics / 20)
  const masteryH    = opts.totalTopicCount > 0 ? opts.masteredTopicCount / opts.totalTopicCount : 0
  const testConsist = Math.min(1, opts.totalTests / 10)

  const score = Math.round(
    acc         * 0.40 +
    weakBurden  * 0.25 +
    masteryH    * 0.15 +
    testConsist * 0.20
  ) * 100

  const levels: Array<{ label: ReadinessResult['label']; color: string; min: number; band: string }> = [
    { label: 'Low',         color: '#ff5a5a', min: 0,  band: 'AIR 5000+'      },
    { label: 'Developing',  color: '#ffb85a', min: 25, band: 'AIR 1000–5000'  },
    { label: 'Competitive', color: '#5ab4ff', min: 45, band: 'AIR 200–1000'   },
    { label: 'Strong',      color: '#4dff94', min: 65, band: 'AIR 50–200'     },
    { label: 'Elite',       color: '#e8ff5a', min: 80, band: 'AIR 1–50'       },
  ]
  const level = [...levels].reverse().find(l => score >= l.min) ?? levels[0]

  const bottlenecks: string[] = []
  if (opts.overallAccuracy < 70) bottlenecks.push(`Practice accuracy ${opts.overallAccuracy}% — below competitive threshold`)
  if (opts.activeWeakTopics > 10) bottlenecks.push(`${opts.activeWeakTopics} unresolved weak topics`)
  if (masteryH < 0.3)  bottlenecks.push('Mastery health < 30% — more practice needed')
  if (testConsist < 0.3) bottlenecks.push(`Only ${opts.totalTests} test(s) — take at least 10 for calibration`)

  const levers = [
    'Solve 50 questions this week — accuracy is the highest-weight factor',
    `Clear your top 5 weak topics — they suppress rank disproportionately`,
    'Take 3 full mocks and analyze each within 24 hours',
    'Complete revision stage for all "New" items in the queue',
  ]

  return {
    score,
    label:           level.label,
    color:           level.color,
    realistic_band:  level.band,
    components: [
      { label: 'Practice Accuracy',   value: Math.round(acc * 100),         bar_pct: Math.round(acc * 100),         color: '#e8ff5a' },
      { label: 'Weak Topic Control',  value: Math.round(weakBurden * 100),  bar_pct: Math.round(weakBurden * 100),  color: '#4dff94' },
      { label: 'Topic Mastery',       value: Math.round(masteryH * 100),    bar_pct: Math.round(masteryH * 100),    color: '#5ab4ff' },
      { label: 'Mock Consistency',    value: Math.round(testConsist * 100), bar_pct: Math.round(testConsist * 100), color: '#b85aff' },
    ],
    bottlenecks,
    fastest_lever: levers[bottlenecks.length > 0 ? 0 : 2],
  }
}
