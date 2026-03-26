// src/lib/utils/validation.ts
// ─── Input validation helpers for API routes ─────────────────────────────────

import type { MistakeType, FocusMode, RevisionItemType } from '@/types/database'
import { SUBJECT_NAMES } from './constants'

// ── Generic ───────────────────────────────────────────────────────────────────

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function isValidUUID(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export function isISODate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

// ── Domain specific ────────────────────────────────────────────────────────────

export function isValidSubject(v: unknown): v is string {
  return typeof v === 'string' && SUBJECT_NAMES.includes(v)
}

export function isValidMistakeType(v: unknown): v is MistakeType {
  const valid: MistakeType[] = ['concept_gap','silly_mistake','formula_error','calculation_error','guessed_wrong','time_pressure','unknown']
  return valid.includes(v as MistakeType)
}

export function isValidFocusMode(v: unknown): v is FocusMode {
  const valid: FocusMode[] = ['balanced','recovery','aggressive','mock_week','final_revision']
  return valid.includes(v as FocusMode)
}

export function isValidRevisionItemType(v: unknown): v is RevisionItemType {
  const valid: RevisionItemType[] = ['topic','formula','question','concept','mistake_pattern','shortcut']
  return valid.includes(v as RevisionItemType)
}

export function isValidRevisionDirection(v: unknown): v is 'advance'|'reset'|'suspend'|'master' {
  return ['advance','reset','suspend','master'].includes(v as string)
}

export function isValidConfidenceLevel(v: unknown): v is number {
  return typeof v === 'number' && v >= 0 && v <= 1
}

// ── Sanitizers ─────────────────────────────────────────────────────────────────

export function sanitizeText(v: unknown, maxLen = 500): string | null {
  if (!isNonEmptyString(v)) return null
  return v.trim().slice(0, maxLen)
}

export function sanitizeInt(v: unknown, min: number, max: number): number | null {
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) return null
  return Math.floor(n)
}

export function sanitizeFloat(v: unknown, min: number, max: number): number | null {
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) return null
  return n
}

// ── API response helpers ───────────────────────────────────────────────────────

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 })
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export function notFound(thing = 'Resource') {
  return Response.json({ error: `${thing} not found` }, { status: 404 })
}

export function serverError(message = 'Internal server error') {
  return Response.json({ error: message }, { status: 500 })
}

export function ok<T>(data: T) {
  return Response.json(data, { status: 200 })
}

export function created<T>(data: T) {
  return Response.json(data, { status: 201 })
}
