'use client'
// src/components/dashboard/CommandPanel.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SYLLABUS, FOCUS_MODE_LABELS, computeTopicROI } from '@/lib/utils/constants'
import { getMasteryLabel, MASTERY_COLOR, buildROIMap } from '@/lib/utils/scoring'
import { parseMarkdownToHtml } from '@/lib/ai/claude'
import type { DashboardSummary, StudyRecommendation } from '@/types/domain'
import type { DbWeakTopic, DbRevisionItem, DbTestRecord, DbTopicMastery, FocusMode } from '@/types/database'

interface Props {
  userId: string
  summary: DashboardSummary
  weakTopics: DbWeakTopic[]
  revisionQueue: DbRevisionItem[]
  testHistory: DbTestRecord[]
  masteryList: DbTopicMastery[]
}

type Tab = 'command' | 'countdown' | 'syllabus'

export default function CommandPanel({ userId, summary, weakTopics, revisionQueue, testHistory, masteryList }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('command')
  const [focusMode, setFocusMode] = useState<FocusMode>(summary.profile.focus_mode)
  const [savingMode, setSavingMode] = useState(false)

  const recommendation = computeRecommendation(summary, weakTopics, revisionQueue, focusMode)
  const overdue = revisionQueue.filter(r => new Date(r.next_due_at) < new Date() && r.revision_stage !== 'mastered')

  async function changeFocusMode(mode: FocusMode) {
    setFocusMode(mode); setSavingMode(true)
    await fetch('/api/profile', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ focus_mode: mode }) })
    setSavingMode(false)
  }

  return (
    <div className="app-content">
      <div className="sub-nav" style={{ marginLeft:'-20px', marginRight:'-20px', paddingLeft:'20px', marginBottom:'18px' }}>
        {(['command','countdown','syllabus'] as Tab[]).map(t => (
          <div key={t} className={`sub-tab ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
            {t==='command'?'Command':t==='countdown'?'Countdown Modes':'Syllabus Map'}
          </div>
        ))}
      </div>

      {activeTab === 'command' && (
        <div className="fade-up">
          <div className="sec-hdr">
            <div><div className="sec-title">AIR-1 Command</div><div className="sec-desc">Priority engine — based on your real performance data</div></div>
          </div>

          {/* Focus mode */}
          <div className="card card-sm" style={{ marginBottom:'12px' }}>
            <div className="card-title">Focus Mode {savingMode && <span style={{ color:'var(--text3)', fontSize:'9px', marginLeft:'6px' }}>saving…</span>}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {Object.entries(FOCUS_MODE_LABELS).map(([mode, label]) => (
                <div key={mode} className={`chip ${focusMode===mode?'active':''}`} onClick={() => changeFocusMode(mode as FocusMode)}>{label}</div>
              ))}
            </div>
          </div>

          {/* Primary recommendation */}
          <div className="study-rec" style={{ marginBottom:'12px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', color:'var(--accent)', marginBottom:'10px', position:'relative' }}>
              📍 Highest Priority Right Now
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'12px', alignItems:'start', position:'relative' }}>
              <div>
                <div style={{ fontSize:'20px', fontWeight:800, color:'var(--accent)', fontFamily:'var(--font2)' }}>{recommendation.subject}</div>
                <div style={{ fontSize:'13px', color:'var(--text2)', marginTop:'3px' }}>→ <strong style={{ color:'var(--text)' }}>{recommendation.topic}</strong></div>
                <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:'7px' }}>{recommendation.reason}</div>
                <div className="btn-row" style={{ marginTop:'10px' }}>
                  <Link href={`/${recommendation.action_panel}`} className="btn btn-acc">{recommendation.action_label}</Link>
                  <Link href="/analyze" className="btn btn-ghost btn-sm">ROI Map</Link>
                  {overdue.length > 0 && <Link href="/revise" className="btn btn-sm" style={{ background:'var(--orange-dim)', color:'var(--orange)', border:'1px solid rgba(255,184,90,.3)' }}>⚠ {overdue.length} Overdue</Link>}
                </div>
              </div>
              <div style={{ textAlign:'right', minWidth:'72px' }}>
                <div style={{ fontSize:'28px', fontWeight:800, fontFamily:'var(--font2)', color: recommendation.subject_accuracy>=70?'var(--green)':recommendation.subject_accuracy>=45?'var(--orange)':'var(--red)' }}>
                  {recommendation.subject_accuracy > 0 ? recommendation.subject_accuracy + '%' : '—'}
                </div>
                <div style={{ fontSize:'9px', color:'var(--text3)' }}>Accuracy</div>
              </div>
            </div>
            {recommendation.avoid_subject && (
              <div style={{ marginTop:'10px', padding:'8px 12px', background:'rgba(255,255,255,.02)', border:'1px solid var(--border)', borderRadius:'6px', fontSize:'11px', color:'var(--text3)' }}>
                ⛔ {recommendation.avoid_reason}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid-4" style={{ marginBottom:'12px' }}>
            <div className="stat-c"><div className="stat-num">{summary.analytics.total_attempted}</div><div className="stat-lbl">Questions</div></div>
            <div className="stat-c accent-card"><div className="stat-num">{summary.analytics.overall_accuracy > 0 ? summary.analytics.overall_accuracy + '%' : '—'}</div><div className="stat-lbl">Accuracy</div></div>
            <div className="stat-c"><div className="stat-num" style={{ color:'var(--red)' }}>{summary.analytics.active_weak_topics}</div><div className="stat-lbl">Weak Topics</div></div>
            <div className="stat-c"><div className="stat-num" style={{ color: overdue.length>0?'var(--orange)':'var(--accent)' }}>{overdue.length}</div><div className="stat-lbl">Rev Overdue</div></div>
          </div>

          {/* Today's plan summary */}
          {summary.today_plan && (
            <div className="card">
              <div className="card-title">Today's Plan — {summary.today_plan.completion_pct}% complete</div>
              <div style={{ marginBottom:'8px' }}><div className="prog-wrap"><div className="prog" style={{ width:`${summary.today_plan.completion_pct}%` }}/></div></div>
              {summary.today_plan.tasks.slice(0,4).map(task => (
                <div key={task.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:'12px' }}>
                  <span style={{ color: task.completed?'var(--green)':'var(--text3)' }}>{task.completed?'✓':'○'}</span>
                  <span style={{ flex:1, color: task.completed?'var(--text3)':'var(--text)', textDecoration: task.completed?'line-through':'' }}>{task.title}</span>
                  <span style={{ fontSize:'10px', color:'var(--text3)' }}>{task.estimated_minutes}m</span>
                </div>
              ))}
              <Link href="/revise" className="btn btn-ghost btn-sm" style={{ marginTop:'8px' }}>View Full Plan →</Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'countdown' && <CountdownTab userId={userId} weakTopics={weakTopics}/>}
      {activeTab === 'syllabus' && <SyllabusTab weakTopics={weakTopics} subjAcc={summary.analytics.subject_accuracy}/>}
    </div>
  )
}

// ── Decision engine ────────────────────────────────────────────────────────────
function computeRecommendation(
  summary: DashboardSummary,
  weakTopics: DbWeakTopic[],
  revisionQueue: DbRevisionItem[],
  focusMode: FocusMode
): StudyRecommendation {
  const subjAcc = summary.analytics.subject_accuracy
  const overdue = revisionQueue.filter(r => new Date(r.next_due_at) < new Date()).length

  const scored = SYLLABUS.map(subj => {
    const sd = subjAcc[subj.name] || { attempted:0, correct:0, wrong:0, accuracy:0 }
    const acc = sd.attempted > 0 ? sd.accuracy / 100 : 0.5
    const weakCount = weakTopics.filter(w => subj.topics.some(t => t.name === w.topic)).length
    const overdueCount = revisionQueue.filter(r => r.subject===subj.name && new Date(r.next_due_at)<new Date()).length
    const roiAvg = subj.topics.reduce((a,t) => a + computeTopicROI(t.name, subj.name, sd.accuracy || 0), 0) / subj.topics.length

    let urgency = 0
    if      (focusMode==='recovery')       urgency = (1-acc)*.5 + (weakCount/10)*.35 + overdueCount*.05
    else if (focusMode==='aggressive')     urgency = (roiAvg/100)*.5 + (subj.weight/15)*.3 + (1-acc)*.2
    else if (focusMode==='mock_week')      urgency = (subj.weight/15)*.6 + (1-acc)*.4
    else if (focusMode==='final_revision') urgency = overdueCount*.4 + (weakCount/10)*.6
    else                                   urgency = (1-acc)*.3 + (roiAvg/100)*.3 + (weakCount/10)*.2 + (subj.weight/15)*.2

    return { subj, acc, weakCount, overdueCount, urgency:Math.min(1,urgency), roiAvg, sd }
  }).sort((a,b) => b.urgency - a.urgency)

  const best = scored[0]
  const bestTopic = best.subj.topics.find(t => weakTopics.some(w => w.topic===t.name))?.name ?? best.subj.topics[0]?.name ?? '—'
  const easiest = scored[scored.length-1]

  let action: StudyRecommendation['action'] = 'practice'
  let action_label = 'Practice Now →'
  let action_panel = 'practice'
  let reason = `Highest ROI subject in ${focusMode} mode`

  if (overdue > 4) { action='revise'; action_label=`Review ${overdue} Overdue Items →`; action_panel='revise'; reason=`${overdue} revision items overdue — complete these first` }
  else if (best.acc < 0.45 && best.subj.weight >= 10) { action='teach'; action_label='Deep Study →'; action_panel='learn'; reason=`Accuracy ${Math.round(best.acc*100)}% — needs conceptual reinforcement` }

  return {
    subject: best.subj.name, topic: bestTopic, reason,
    urgency: best.urgency, action, action_label, action_panel,
    subject_accuracy: Math.round(best.acc * 100),
    overdue_count: overdue,
    weak_count: best.weakCount,
    avoid_subject: easiest.acc > 0.85 ? easiest.subj.name : null,
    avoid_reason: easiest.acc > 0.85 ? `Don't over-study ${easiest.subj.name} — diminishing returns (${Math.round(easiest.acc*100)}% accuracy)` : null,
  }
}

// ── Countdown tab ──────────────────────────────────────────────────────────────
function CountdownTab({ userId, weakTopics }: { userId: string; weakTopics: DbWeakTopic[] }) {
  const [days, setDays] = useState<60|30|14|7|null>(null)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')

  async function loadPlan(d: 60|30|14|7) {
    setDays(d); setLoading(true); setContent('')
    const res = await fetch('/api/ai',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'countdown', days: d, weakTopics: weakTopics.map(w=>w.topic).slice(0,5) }) })
    const data = await res.json()
    setContent(data.html || data.raw || '')
    setLoading(false)
  }

  return (
    <div className="fade-up">
      <div className="sec-hdr"><div><div className="sec-title">Countdown Modes</div><div className="sec-desc">Exam proximity changes what matters most</div></div></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'14px' }}>
        {([60,30,14,7] as (60|30|14|7)[]).map(d => (
          <div key={d} className={`card card-sm ${days===d?'accent-card':''}`} style={{ cursor:'pointer', textAlign:'center' }} onClick={() => loadPlan(d)}>
            <div style={{ fontSize:'18px', fontWeight:800, color:'var(--accent)', fontFamily:'var(--font2)' }}>{d}</div>
            <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text)', marginTop:'2px' }}>Days</div>
            <div style={{ fontSize:'10px', color:'var(--text3)', marginTop:'3px' }}>
              {d===60?'Coverage + Mocks':d===30?'Revise + Analyse':d===14?'Formula Sprint':'Calm & Consolidate'}
            </div>
          </div>
        ))}
      </div>
      {loading && <div className="ai-loading"><div className="spin"/>Generating battle plan…</div>}
      {content && <div className="ai-resp" dangerouslySetInnerHTML={{ __html: content }}/>}
      <div className="grid-2" style={{ marginTop: content?'14px':'0' }}>
        <div className="card urgent-card">
          <div className="card-title" style={{ color:'var(--red)' }}>Weak Rescue List</div>
          {weakTopics.length ? weakTopics.slice(0,8).map(w => (
            <div key={w.id} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:'11px' }}>
              <span style={{ color:'var(--red)' }}>⚠</span>
              <span style={{ flex:1, color:'var(--text2)' }}>{w.topic}</span>
              <span style={{ fontSize:'10px', color:'var(--text3)' }}>{w.subject.split(' ')[0]}</span>
            </div>
          )) : <div style={{ color:'var(--green)', fontSize:'12px' }}>✅ No active weak topics</div>}
        </div>
        <div className="card">
          <div className="card-title" style={{ color:'var(--red)' }}>Exam-Week Rules</div>
          <div className="card-p">1. Zero new topics after Day –7<br/>2. Formula sheets only in final 3 days<br/>3. No panic mocks — 1 light test max<br/>4. 8h sleep — non-negotiable<br/>5. Review mistake journal daily<br/>6. Trust your preparation</div>
        </div>
      </div>
    </div>
  )
}

// ── Syllabus tab ───────────────────────────────────────────────────────────────
function SyllabusTab({ weakTopics, subjAcc }: { weakTopics: DbWeakTopic[]; subjAcc: Record<string,any> }) {
  const weakSet = new Set(weakTopics.map(w => w.topic))
  return (
    <div className="fade-up">
      <div className="sec-hdr"><div><div className="sec-title">Syllabus Map</div><div className="sec-desc">Red chips = active weak topics</div></div></div>
      {SYLLABUS.map(subj => (
        <div key={subj.name} style={{ marginBottom:'18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'7px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:subj.color }}/>
            <span style={{ fontSize:'12px', fontWeight:700, color:subj.color }}>{subj.icon} {subj.name}</span>
            <span className="tag tag-acc">{subj.weight}m</span>
            {subjAcc[subj.name] && <span style={{ fontSize:'10px', color:'var(--text3)' }}>{subjAcc[subj.name].accuracy}% acc</span>}
          </div>
          <div className="chip-wrap">
            {subj.topics.map(t => (
              <div key={t.name} className="chip" style={ weakSet.has(t.name) ? { borderColor:'var(--red)', background:'var(--red-dim)', color:'var(--red)' } : {} }>
                {t.name}{weakSet.has(t.name)?' ⚠':''}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Re-export for use by scoring util ─────────────────────────────────────────
function computeTopicROI(topicName: string, subjectName: string, accuracy: number): number {
  const subj = SYLLABUS.find(s => s.name === subjectName)
  const td   = subj?.topics.find(t => t.name === topicName)
  if (!subj || !td) return 30
  return Math.round(td.freq/10 * (subj.weight/15) * (1 - (accuracy/100) * 0.7) * 100)
}
