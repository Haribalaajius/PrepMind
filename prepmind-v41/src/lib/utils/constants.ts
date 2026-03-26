// src/lib/utils/constants.ts
// ─── GATE EC 2027 syllabus and static metadata ───────────────────────────────

export interface TopicMeta {
  name: string
  freq: number    // 1–10: how frequently it appears in GATE
  diff: number    // 1–10: difficulty level
  roi:  number    // 1–10: baseline return on study investment
}

export interface SubjectMeta {
  name:   string
  icon:   string
  color:  string
  weight: number  // approximate marks in GATE EC
  topics: TopicMeta[]
}

export const SYLLABUS: SubjectMeta[] = [
  { name: 'Engineering Mathematics', icon: '∑', color: '#5ab4ff', weight: 13, topics: [
    { name: 'Linear Algebra',        freq: 9, diff: 6, roi: 8 },
    { name: 'Calculus',              freq: 7, diff: 5, roi: 7 },
    { name: 'Differential Equations',freq: 8, diff: 6, roi: 8 },
    { name: 'Complex Variables',     freq: 6, diff: 7, roi: 6 },
    { name: 'Probability & Statistics', freq: 7, diff: 5, roi: 7 },
    { name: 'Numerical Methods',     freq: 4, diff: 5, roi: 5 },
    { name: 'Transform Theory',      freq: 8, diff: 7, roi: 9 },
  ]},
  { name: 'Networks, Signals & Systems', icon: '〜', color: '#e8ff5a', weight: 15, topics: [
    { name: 'Network Theorems',      freq: 9, diff: 6, roi: 9 },
    { name: 'KVL/KCL Analysis',      freq: 8, diff: 5, roi: 8 },
    { name: 'Two-Port Networks',     freq: 8, diff: 7, roi: 8 },
    { name: 'AC Steady-State',       freq: 7, diff: 6, roi: 7 },
    { name: 'Fourier Transform',     freq: 9, diff: 7, roi: 9 },
    { name: 'Laplace Transform',     freq: 9, diff: 7, roi: 9 },
    { name: 'Z-Transform',           freq: 7, diff: 7, roi: 8 },
    { name: 'LTI Systems',           freq: 8, diff: 6, roi: 8 },
    { name: 'Sampling Theorem',      freq: 7, diff: 5, roi: 7 },
  ]},
  { name: 'Electronic Devices', icon: '⬡', color: '#4dff94', weight: 10, topics: [
    { name: 'PN Junction Diode',     freq: 7, diff: 5, roi: 7 },
    { name: 'BJT Characteristics',   freq: 8, diff: 6, roi: 8 },
    { name: 'MOSFET Operation',      freq: 9, diff: 6, roi: 9 },
    { name: 'JFET',                  freq: 5, diff: 5, roi: 5 },
    { name: 'Energy Bands',          freq: 6, diff: 7, roi: 6 },
    { name: 'Diode Applications',    freq: 6, diff: 5, roi: 6 },
  ]},
  { name: 'Analog Circuits', icon: '≋', color: '#ffb85a', weight: 10, topics: [
    { name: 'BJT Amplifiers',        freq: 8, diff: 7, roi: 8 },
    { name: 'Op-Amp Fundamentals',   freq: 9, diff: 5, roi: 9 },
    { name: 'Op-Amp Applications',   freq: 8, diff: 6, roi: 8 },
    { name: 'Feedback Amplifiers',   freq: 7, diff: 8, roi: 8 },
    { name: 'Oscillators',           freq: 6, diff: 7, roi: 6 },
    { name: 'Active Filters',        freq: 6, diff: 6, roi: 6 },
    { name: 'Power Supplies',        freq: 4, diff: 5, roi: 4 },
  ]},
  { name: 'Digital Circuits', icon: '⬛', color: '#b85aff', weight: 10, topics: [
    { name: 'Boolean Algebra',       freq: 7, diff: 4, roi: 7 },
    { name: 'Combinational Logic',   freq: 8, diff: 5, roi: 8 },
    { name: 'Multiplexers',          freq: 7, diff: 5, roi: 7 },
    { name: 'Flip-Flops',            freq: 8, diff: 6, roi: 8 },
    { name: 'Counters',              freq: 7, diff: 5, roi: 7 },
    { name: 'ADC/DAC',               freq: 7, diff: 7, roi: 7 },
    { name: 'Memory & PLDs',         freq: 5, diff: 5, roi: 5 },
  ]},
  { name: 'Control Systems', icon: '⟳', color: '#ff5a5a', weight: 10, topics: [
    { name: 'Transfer Functions',      freq: 9, diff: 6, roi: 9 },
    { name: 'Block Diagram Reduction', freq: 8, diff: 6, roi: 8 },
    { name: 'Signal Flow Graphs',      freq: 7, diff: 6, roi: 7 },
    { name: 'Routh-Hurwitz',           freq: 8, diff: 5, roi: 8 },
    { name: 'Root Locus',              freq: 8, diff: 7, roi: 8 },
    { name: 'Bode Plot',               freq: 9, diff: 7, roi: 9 },
    { name: 'Nyquist Criterion',       freq: 7, diff: 8, roi: 7 },
    { name: 'State Space',             freq: 7, diff: 8, roi: 7 },
  ]},
  { name: 'Communications', icon: '📡', color: '#5ab4ff', weight: 10, topics: [
    { name: 'AM Modulation',         freq: 7, diff: 5, roi: 7 },
    { name: 'FM Modulation',         freq: 7, diff: 6, roi: 7 },
    { name: 'Sampling & PCM',        freq: 7, diff: 6, roi: 7 },
    { name: 'Digital Modulation',    freq: 8, diff: 7, roi: 8 },
    { name: 'Noise & SNR',           freq: 8, diff: 7, roi: 8 },
    { name: 'Information Theory',    freq: 7, diff: 7, roi: 7 },
    { name: 'Multiple Access',       freq: 5, diff: 6, roi: 5 },
  ]},
  { name: 'Electromagnetics', icon: '⚡', color: '#e8ff5a', weight: 10, topics: [
    { name: "Maxwell's Equations",   freq: 8, diff: 8, roi: 8 },
    { name: 'Wave Propagation',      freq: 7, diff: 7, roi: 7 },
    { name: 'Transmission Lines',    freq: 8, diff: 7, roi: 8 },
    { name: 'Waveguides',            freq: 6, diff: 8, roi: 6 },
    { name: 'Antennas',              freq: 6, diff: 7, roi: 6 },
    { name: 'Boundary Conditions',   freq: 7, diff: 7, roi: 7 },
  ]},
]

export const SUBJECT_NAMES = SYLLABUS.map(s => s.name)

export function getSubjectMeta(name: string): SubjectMeta | undefined {
  return SYLLABUS.find(s => s.name === name)
}

export function getTopicMeta(topic: string): { topic: TopicMeta; subject: SubjectMeta } | undefined {
  for (const subj of SYLLABUS) {
    const t = subj.topics.find(t => t.name === topic)
    if (t) return { topic: t, subject: subj }
  }
}

// Spaced repetition interval map
export const REVISION_INTERVALS: Record<string, number> = {
  new:        0,    // due immediately
  revision_1: 1,    // 1 day
  revision_2: 3,    // 3 days
  revision_3: 7,    // 7 days
  mastered:   21,   // 21 days
  suspended:  999,
}

export const FOCUS_MODE_LABELS: Record<string, string> = {
  balanced:        'Balanced',
  recovery:        'Recovery',
  aggressive:      'Aggressive',
  mock_week:       'Mock Week',
  final_revision:  'Final Rev',
}

export const MISTAKE_TYPE_LABELS: Record<string, string> = {
  concept_gap:       'Concept Gap',
  silly_mistake:     'Silly Mistake',
  formula_error:     'Formula Error',
  calculation_error: 'Calc Error',
  guessed_wrong:     'Guessed Wrong',
  time_pressure:     'Time Pressure',
  unknown:           'Unknown',
}

export const MISTAKE_TYPE_CSS: Record<string, string> = {
  concept_gap:       'mt-concept',
  silly_mistake:     'mt-silly',
  formula_error:     'mt-formula',
  calculation_error: 'mt-calc',
  guessed_wrong:     'mt-guess',
  time_pressure:     'mt-time',
  unknown:           'mt-concept',
}
