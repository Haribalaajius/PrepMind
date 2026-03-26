// src/lib/ai/prompts.ts
// ─── Centralized prompt templates for all AI features ────────────────────────

export const SYSTEM_BASE = `You are an elite AI mentor for GATE EC 2027. The user targets AIR 1 (top rank).

Rules:
- Exam-specific, practical, precise. Never motivational fluff.
- Format: ### for section headers, **bold** for key terms, \`code\` for formulas.
- Always include: exam relevance, conceptual clarity, shortcut methods, GATE trap patterns.
- Responses must be actionable, not aspirational.`

export const SYSTEM_QUESTIONS = `${SYSTEM_BASE}

For question generation, return ONLY a valid JSON array. No markdown fences. No explanation text.
Each question object must have:
{
  "question": "string — the full question text",
  "options": ["string", "string", "string", "string"],
  "correct": 0,
  "explanation": "string — step-by-step correct solution",
  "shortcut": "string — fastest GATE method",
  "concept": "string — core concept being tested",
  "subject": "string — GATE EC subject name",
  "topic": "string — specific topic",
  "difficulty": "Easy|Medium|Hard|Trap",
  "wrong_analysis": "string — why each wrong option is wrong",
  "estimated_seconds": 90,
  "trap_type": "string — the specific GATE trap in this question"
}`

export function buildQuestionPrompt(opts: {
  count: number
  subject?: string
  topic?: string
  difficulty?: string
  weakTopics?: string[]
  isPYQ?: boolean
  pyqDifficulty?: 'actual' | 'harder'
}): string {
  const lines: string[] = [
    `Generate ${opts.count} GATE EC 2027 ${opts.isPYQ ? 'PYQ-style ' : ''}questions.`,
  ]
  if (opts.subject) lines.push(`Subject: ${opts.subject}.`)
  if (opts.topic)   lines.push(`Topic: ${opts.topic}.`)
  if (opts.difficulty && opts.difficulty !== 'mixed') lines.push(`Difficulty: ${opts.difficulty}.`)
  if (opts.weakTopics?.length) {
    lines.push(`Focus specifically on these weak topics: ${opts.weakTopics.join(', ')}.`)
  }
  if (opts.isPYQ) {
    lines.push(opts.pyqDifficulty === 'harder'
      ? 'Make questions slightly harder than actual GATE PYQs. Increase trap density.'
      : 'Match actual GATE PYQ difficulty exactly. Include realistic numerical values.')
  }
  lines.push('Return ONLY valid JSON array. No preamble, no markdown, no explanation.')
  return lines.join('\n')
}

export function buildTeachPrompt(topic: string, subject: string, mode: 'beginner' | 'topper'): string {
  const modeInstr = mode === 'topper'
    ? 'Teach for an AIR-1 aspirant with strong fundamentals. Dense, formula-heavy, shortcut-focused. Assume the person understands the basics.'
    : 'Teach assuming strong motivation but beginner-level knowledge. Build from physical intuition to formula. Use analogies.'

  return `Teach "${topic}" (${subject}) for GATE EC 2027.

${modeInstr}

### Physical Intuition
### Core Formulas (with all variable definitions)
### Derivation Summary (key steps only)
### Shortcut Methods for GATE
### Common GATE Traps (specific, not generic)
### Solved GATE-Style Example (step by step)
### Exam Lens (what GATE actually tests here)`
}

export function buildRecallPrompt(opts: {
  count: number
  subject?: string
  type: string
}): string {
  const typeDesc: Record<string, string> = {
    formula:  'formula recall (ask user to state the exact formula from memory, include units)',
    concept:  'concept distinction (spot the key difference between two closely related GATE concepts)',
    trap:     'trap recall (describe a scenario and ask user to identify the GATE trap)',
    shortcut: 'shortcut recall (ask user to recall the fastest method for this question type)',
    mixed:    'mix of formula recall, concept distinction, and trap identification',
  }
  return [
    `Generate ${opts.count} GATE EC recall drill cards.`,
    opts.subject ? `Subject: ${opts.subject}.` : 'Cover all GATE EC subjects.',
    `Type: ${typeDesc[opts.type] || typeDesc.mixed}`,
    '',
    'Return ONLY valid JSON array. Each card:',
    '{"question":"What is…?","answer":"The formula/concept is…","subject":"","topic":"","type":"formula","difficulty":"medium"}',
  ].join('\n')
}

export function buildTestAnalysisPrompt(opts: {
  score?: number; attempted?: number; correct?: number; wrong?: number
  time?: number; subjectScores?: { name: string; score: number }[]
}): string {
  const sw = opts.subjectScores?.map(s => `${s.name}: ${s.score}`).join(', ') ?? 'not provided'
  return `GATE EC AIR-1 mock analysis.

Score: ${opts.score ?? '?'}, Attempted: ${opts.attempted ?? '?'}/65, Correct: ${opts.correct ?? '?'}, Wrong: ${opts.wrong ?? '?'}, Time: ${opts.time ?? '?'} min.
Subject-wise: ${sw}.

### Performance Diagnosis
### Strongest Subjects (what to maintain)
### Weakest Subjects (root cause, not just observation)
### Confidence Pattern Issues (overconfidence / lucky guesses)
### Top 3 Priorities Before Next Mock
### 7-Day Action Plan (day-by-day tasks, not vague advice)`
}

export function buildDailyPlanPrompt(opts: {
  hours: number; energy: string; mockDate?: string; focus?: string
  weakTopics?: string[]; focusMode: string
}): string {
  return `GATE EC 2027 daily study plan for today.

Available: ${opts.hours} hours. Energy: ${opts.energy}. Mode: ${opts.focusMode}.
${opts.mockDate ? `Next mock: ${opts.mockDate}.` : ''}
${opts.focus ? `Priority focus: ${opts.focus}.` : ''}
${opts.weakTopics?.length ? `Active weak topics: ${opts.weakTopics.slice(0, 5).join(', ')}.` : ''}

Generate:
### Top 3 Priorities Today (specific, not categories)
### Study Blocks (time, task, what exactly to do)
### Revision Block (which topics, what method)
### Practice Target (subject, difficulty, count)
### One Non-Negotiable Task
### What to Skip Today (avoid today because…)

No motivational padding. Be specific.`
}

export function buildCountdownPrompt(days: 60 | 30 | 14 | 7, weakTopics: string[]): string {
  const emphasis: Record<number, string> = {
    60: 'coverage completion, mock habit, and systematic weak-topic reduction',
    30: 'revision compression, mock analysis loop, and mistake consolidation',
    14: 'formula sprint, weak-area rescue, and confidence stabilization',
    7:  'calm consolidation, zero new topics, light recall, mental preparation',
  }
  return `GATE EC 2027 — ${days}-day battle plan.

Phase emphasis: ${emphasis[days]}.
${weakTopics.length ? `Weak topics to address: ${weakTopics.slice(0, 5).join(', ')}.` : ''}

### Days Structure (week-by-week breakdown)
### Daily Theme for Each Phase
### Mock Test Frequency Recommendation
### What to Stop Doing Immediately
### Common Last-Phase Mistakes to Avoid
### Emergency Protocol (if behind schedule)

Precise. Actionable. No generic advice.`
}

export function buildROIRecommendationPrompt(topTopics: string): string {
  return `GATE EC ROI analysis. High-priority topics: ${topTopics}.

Provide in exactly 4 lines:
1. Best next topic to study and why
2. Best next subject and why  
3. Most dangerous weak area (cost of ignoring it)
4. Highest-return revision task right now

One line each. Specific. No preamble.`
}

export function buildMistakeDiagnosisPrompt(opts: {
  subject: string; topic?: string; mistakeType: string
  questionSummary?: string; lessonLearned?: string
}): string {
  return `Diagnose GATE EC mistake.

Subject: ${opts.subject}. Topic: ${opts.topic ?? 'unspecified'}. Type: ${opts.mistakeType}.
Question: ${opts.questionSummary ?? 'not provided'}.
Lesson logged: ${opts.lessonLearned ?? 'none'}.

### Root Cause (one specific sentence)
### Pattern This Belongs To (what class of mistake)
### Prevention Strategy (exactly how to avoid this next time)
### One Corrective Drill (specific question type to practice)`
}
