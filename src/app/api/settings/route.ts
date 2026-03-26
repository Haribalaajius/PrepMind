// src/app/api/settings/route.ts
import { NextRequest } from 'next/server'
import { requireAuthUser } from '@/lib/supabase/server'
import { getSettings } from '@/lib/db/queries'
import { saveApiKey, removeApiKey } from '@/lib/db/mutations'
import { ok, badRequest, unauthorized, serverError } from '@/lib/utils/validation'

export async function GET(_req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  // getSettings never returns api_key_enc
  try { return ok(await getSettings(user.id)) }
  catch (err) { console.error('[GET /api/settings]', err); return serverError() }
}

export async function PATCH(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuthUser>>
  try { user = await requireAuthUser() } catch { return unauthorized() }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return badRequest('Invalid JSON') }

  try {
    if (body.api_key === null || body.remove_api_key === true) {
      await removeApiKey(user.id)
      return ok({ success: true, has_custom_api_key: false })
    }
    if (typeof body.api_key === 'string') {
      if (!body.api_key.startsWith('sk-ant-')) return badRequest('Invalid Anthropic API key format (must start with sk-ant-)')
      await saveApiKey(user.id, body.api_key)
      return ok({ success: true, has_custom_api_key: true })
    }
    return badRequest('No valid operation in request body')
  } catch (err: any) {
    console.error('[PATCH /api/settings]', err)
    if (err?.message?.includes('Invalid Anthropic')) return badRequest(err.message)
    return serverError()
  }
}
