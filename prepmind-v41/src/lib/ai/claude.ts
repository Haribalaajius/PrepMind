// src/lib/ai/claude.ts
// ─── Server-side Anthropic API wrapper. Never import in client code. ──────────

import type { GATEQuestion, RecallCard } from '@/types/domain'

const MODEL = 'claude-sonnet-4-20250514'
const BASE_URL = 'https://api.anthropic.com/v1/messages'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>
  stop_reason: string
}

export class AnthropicError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'AnthropicError'
  }
}

/**
 * Core API call — all AI features route through here.
 * @param messages  Chat history (role+content pairs)
 * @param system    System prompt
 * @param apiKey    Anthropic API key (server env or user's own)
 * @param maxTokens Max tokens for the response
 */
export async function callClaude(
  messages: ChatMessage[],
  system: string,
  apiKey: string,
  maxTokens = 1200
): Promise<string> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new AnthropicError(res.status, `Anthropic API error ${res.status}: ${body}`)
  }

  const data: AnthropicResponse = await res.json()
  const text = data.content.find(c => c.type === 'text')?.text ?? ''
  if (!text) throw new AnthropicError(200, 'Empty response from Anthropic')
  return text
}

/**
 * Resolve the API key to use:
 * 1. User's own key (from DB) — highest priority
 * 2. Server environment key — fallback
 * Returns null if neither is available.
 */
export function resolveApiKey(userKey: string | null | undefined): string | null {
  if (userKey && userKey.startsWith('sk-ant-')) return userKey
  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey && envKey.startsWith('sk-ant-')) return envKey
  return null
}

// ── Parsers ───────────────────────────────────────────────────────────────────

// src/lib/ai/parsers.ts (inlined here for co-location)

/**
 * Parse Claude's response as a JSON array of GATE questions.
 * Returns null if parsing fails — callers must handle fallback.
 */
export function parseQuestions(raw: string): GATEQuestion[] | null {
  try {
    // Strip any markdown fences Claude might add despite instructions
    const clean = raw
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    const start = clean.indexOf('[')
    const end   = clean.lastIndexOf(']')
    if (start < 0 || end <= start) return null

    const arr = JSON.parse(clean.slice(start, end + 1))
    if (!Array.isArray(arr) || arr.length === 0) return null

    // Validate and normalize each question
    return arr
      .filter(q => typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4)
      .map(q => ({
        question:          String(q.question).trim(),
        options:           (q.options as unknown[]).map(o => String(o).trim()) as [string,string,string,string],
        correct:           Number(q.correct ?? 0) as 0|1|2|3,
        explanation:       String(q.explanation  ?? '').trim(),
        shortcut:          String(q.shortcut      ?? '').trim(),
        concept:           String(q.concept       ?? q.topic ?? '').trim(),
        subject:           String(q.subject       ?? 'General').trim(),
        topic:             String(q.topic         ?? '').trim(),
        difficulty:        (['Easy','Medium','Hard','Trap'].includes(q.difficulty) ? q.difficulty : 'Medium') as GATEQuestion['difficulty'],
        wrong_analysis:    String(q.wrong_analysis ?? '').trim(),
        estimated_seconds: Number(q.estimated_seconds ?? 90),
        trap_type:         String(q.trap_type ?? '').trim(),
      }))
  } catch {
    return null
  }
}

/**
 * Parse Claude's response as a JSON array of recall cards.
 */
export function parseRecallCards(raw: string): RecallCard[] | null {
  try {
    const clean = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
    const start = clean.indexOf('['), end = clean.lastIndexOf(']')
    if (start < 0 || end <= start) return null
    const arr = JSON.parse(clean.slice(start, end + 1))
    if (!Array.isArray(arr)) return null
    return arr
      .filter(c => typeof c.question === 'string' && typeof c.answer === 'string')
      .map(c => ({
        question:   String(c.question).trim(),
        answer:     String(c.answer).trim(),
        subject:    String(c.subject ?? '').trim(),
        topic:      String(c.topic   ?? '').trim(),
        type:       (['formula','concept','trap','shortcut'].includes(c.type) ? c.type : 'formula') as RecallCard['type'],
        difficulty: (['easy','medium','hard'].includes(c.difficulty) ? c.difficulty : 'medium') as RecallCard['difficulty'],
      }))
  } catch {
    return null
  }
}

/**
 * Simple Markdown → safe HTML converter for AI prose responses.
 * Used for teaching content, analysis text, daily plans, etc.
 */
export function parseMarkdownToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/###\s+(.+)/g, '<h3>$1</h3>')
    .replace(/##\s+(.+)/g,  '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
}
