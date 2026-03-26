// src/app/api/ai/route.ts
// ─── Server-side Anthropic proxy. Anthropic key never leaves the server. ─────

import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { callClaude, resolveApiKey, parseQuestions, parseRecallCards, parseMarkdownToHtml, AnthropicError } from '@/lib/ai/claude'
import { getDecryptedApiKey } from '@/lib/db/mutations'
import {
  SYSTEM_BASE, SYSTEM_QUESTIONS,
  buildQuestionPrompt, buildTeachPrompt, buildRecallPrompt,
  buildTestAnalysisPrompt, buildDailyPlanPrompt,
  buildCountdownPrompt, buildROIRecommendationPrompt, buildMistakeDiagnosisPrompt,
} from '@/lib/ai/prompts'
import { ok, serverError, badRequest, unauthorized } from '@/lib/utils/validation'

export async function POST(req: NextRequest) {
  // 1. Auth check
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() }
  catch { return unauthorized() }

  // 2. Resolve API key (user's own > server env)
  const userKey = await getDecryptedApiKey(user.id).catch(() => null)
  const apiKey  = resolveApiKey(userKey)
  if (!apiKey) {
    // No key — return demo indicator so the client can use fallback content
    return ok({ demo: true, reason: 'no_api_key' })
  }

  // 3. Parse request
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return badRequest('Invalid JSON body') }

  const { type } = body
  if (typeof type !== 'string') return badRequest('Missing `type` field')

  try {
    switch (type) {

      case 'questions':
      case 'pyq': {
        const count  = Math.min(Number(body.count ?? 5), 20)
        const prompt = buildQuestionPrompt({
          count,
          subject:       typeof body.subject === 'string' ? body.subject : undefined,
          topic:         typeof body.topic   === 'string' ? body.topic   : undefined,
          difficulty:    typeof body.difficulty === 'string' ? body.difficulty : undefined,
          weakTopics:    Array.isArray(body.weakTopics) ? (body.weakTopics as string[]).slice(0, 5) : undefined,
          isPYQ:         type === 'pyq',
          pyqDifficulty: body.pyqDifficulty === 'harder' ? 'harder' : 'actual',
        })
        const raw       = await callClaude([{ role: 'user', content: prompt }], SYSTEM_QUESTIONS, apiKey, 1800)
        const questions = parseQuestions(raw)
        return ok({ questions })
      }

      case 'recall': {
        const count  = Math.min(Number(body.count ?? 8), 20)
        const prompt = buildRecallPrompt({
          count,
          subject: typeof body.subject === 'string' ? body.subject : undefined,
          type:    typeof body.recallType === 'string' ? body.recallType : 'mixed',
        })
        const raw   = await callClaude([{ role: 'user', content: prompt }], SYSTEM_QUESTIONS, apiKey, 1200)
        const cards = parseRecallCards(raw)
        return ok({ cards })
      }

      case 'teach': {
        const topic   = typeof body.topic   === 'string' ? body.topic   : ''
        const subject = typeof body.subject === 'string' ? body.subject : ''
        const mode    = body.mode === 'topper' ? 'topper' : 'beginner'
        if (!topic) return badRequest('Missing `topic`')
        const prompt = buildTeachPrompt(topic, subject, mode)
        const raw    = await callClaude([{ role: 'user', content: prompt }], SYSTEM_BASE, apiKey, 1200)
        return ok({ html: parseMarkdownToHtml(raw), raw })
      }

      case 'chat': {
        const messages = Array.isArray(body.messages) ? body.messages : []
        const weakCtx  = Array.isArray(body.weakTopics) && body.weakTopics.length
          ? `User weak topics: ${(body.weakTopics as string[]).slice(0,5).join(', ')}.`
          : ''
        const focusTopic = typeof body.currentTopic === 'string' ? body.currentTopic : 'General GATE EC'
        const sys = `${SYSTEM_BASE}\n${weakCtx}\nCurrent focus: ${focusTopic}.`
        const raw = await callClaude(
          messages.slice(-12) as { role: 'user'|'assistant'; content: string }[],
          sys, apiKey, 800
        )
        return ok({ html: parseMarkdownToHtml(raw), raw })
      }

      case 'formula_sheet': {
        const subject = typeof body.subject === 'string' ? body.subject : ''
        if (!subject) return badRequest('Missing `subject`')
        const mode  = typeof body.mode === 'string' ? body.mode : 'full'
        const desc  = mode === 'lastmin' ? 'compact last-minute' : mode === 'only' ? 'formulas only, no explanation' : 'comprehensive'
        const raw   = await callClaude([{ role:'user', content:`Generate ${desc} formula sheet for "${subject}" — GATE EC 2027. Include key formulas with variable definitions, GATE shortcuts, top 5 common mistakes, memory aids.` }], SYSTEM_BASE, apiKey, 1000)
        return ok({ html: parseMarkdownToHtml(raw), raw })
      }

      case 'analyze_test': {
        const prompt = buildTestAnalysisPrompt({
          score:         typeof body.score === 'number'     ? body.score     : undefined,
          attempted:     typeof body.attempted === 'number' ? body.attempted : undefined,
          correct:       typeof body.correct === 'number'   ? body.correct   : undefined,
          wrong:         typeof body.wrong === 'number'     ? body.wrong     : undefined,
          time:          typeof body.time === 'number'      ? body.time      : undefined,
          subjectScores: Array.isArray(body.subjectScores)  ? body.subjectScores as { name:string; score:number }[] : undefined,
        })
        const raw = await callClaude([{ role:'user', content: prompt }], SYSTEM_BASE, apiKey, 1000)
        return ok({ html: parseMarkdownToHtml(raw), raw })
      }

      case 'daily_plan': {
        const prompt = buildDailyPlanPrompt({
          hours:      Number(body.hours ?? 6),
          energy:     typeof body.energy === 'string' ? body.energy : 'medium',
          mockDate:   typeof body.mockDate === 'string' ? body.mockDate : undefined,
          focus:      typeof body.focus === 'string' ? body.focus : undefined,
          weakTopics: Array.isArray(body.weakTopics) ? (body.weakTopics as string[]) : [],
          focusMode:  typeof body.focusMode === 'string' ? body.focusMode : 'balanced',
        })
        const raw = await callClaude([{ role:'user', content: prompt }], SYSTEM_BASE, apiKey, 900)
        return ok({ html: parseMarkdownToHtml(raw), raw })
      }

      case 'countdown': {
        const days = ([60,30,14,7] as (60|30|14|7)[]).includes(Number(body.days) as 60|30|14|7)
          ? Number(body.days) as 60|30|14|7 : 30
        const wt = Array.isArray(body.weakTopics) ? (body.weakTopics as string[]) : []
        const prompt = buildCountdownPrompt(days, wt)
        const raw    = await callClaude([{ role:'user', content: prompt }], SYSTEM_BASE, apiKey, 900)
        return ok({ html: parseMarkdownToHtml(raw), raw })
      }

      case 'roi_recommendation': {
        const topTopics = typeof body.topTopics === 'string' ? body.topTopics : ''
        const prompt    = buildROIRecommendationPrompt(topTopics)
        const raw       = await callClaude([{ role:'user', content: prompt }], SYSTEM_BASE, apiKey, 500)
        return ok({ html: parseMarkdownToHtml(raw), raw })
      }

      case 'diagnose_mistake': {
        const prompt = buildMistakeDiagnosisPrompt({
          subject:         typeof body.subject === 'string' ? body.subject : 'General',
          topic:           typeof body.topic === 'string' ? body.topic : undefined,
          mistakeType:     typeof body.mistakeType === 'string' ? body.mistakeType : 'unknown',
          questionSummary: typeof body.questionSummary === 'string' ? body.questionSummary : undefined,
          lessonLearned:   typeof body.lessonLearned === 'string' ? body.lessonLearned : undefined,
        })
        const raw = await callClaude([{ role:'user', content: prompt }], SYSTEM_BASE, apiKey, 600)
        return ok({ html: parseMarkdownToHtml(raw), raw })
      }

      case 'analytics_summary': {
        const stats = body.stats ?? {}
        const raw   = await callClaude([{ role:'user', content:`GATE EC performance summary: ${JSON.stringify(stats)}. In 3 concise bullet points: what's improving, what's decaying, and the single most important change this week.` }], SYSTEM_BASE, apiKey, 400)
        return ok({ html: parseMarkdownToHtml(raw), raw })
      }

      default:
        return badRequest(`Unknown AI request type: ${type}`)
    }
  } catch (err) {
    if (err instanceof AnthropicError) {
      if (err.statusCode === 401) return ok({ error: 'invalid_api_key', demo: true })
      if (err.statusCode === 429) return ok({ error: 'rate_limited', demo: true })
    }
    console.error('[/api/ai]', err)
    return serverError('AI request failed')
  }
}
