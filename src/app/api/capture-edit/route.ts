import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
  }
  return dp[n]
}

export async function POST(request: Request) {
  try {
    const { generationId, finalText } = await request.json()
    console.log('[capture-edit] received — generationId:', generationId, 'finalText.length:', finalText?.length)

    if (!generationId || typeof finalText !== 'string') {
      console.error('[capture-edit] invalid request body')
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: row, error: fetchError } = await supabase
      .from('generations')
      .select('draft_text')
      .eq('id', generationId)
      .single()
    console.log('[capture-edit] fetch row — data:', row ? 'found' : 'null', 'error:', JSON.stringify(fetchError))

    if (fetchError || !row) {
      console.error('[capture-edit] row not found:', generationId, fetchError?.code, fetchError?.message)
      return NextResponse.json({ error: 'Generation not found' }, { status: 400 })
    }

    const draftText: string = row.draft_text
    const wasEdited = finalText !== draftText
    const editDistance = levenshtein(draftText, finalText)
    const editRatio = draftText.length > 0 ? editDistance / draftText.length : 0
    console.log('[capture-edit] computed — wasEdited:', wasEdited, 'editDistance:', editDistance, 'editRatio:', editRatio.toFixed(4))

    const { error: updateError } = await supabase
      .from('generations')
      .update({
        final_text: finalText,
        was_edited: wasEdited,
        edit_distance: editDistance,
        edit_ratio: editRatio,
        copied_at: new Date().toISOString(),
        analysis_status: wasEdited ? 'pending' : 'skipped',
      })
      .eq('id', generationId)
    console.log('[capture-edit] update result — error:', JSON.stringify(updateError))

    if (updateError) console.error('[capture-edit] UPDATE FAILED:', updateError.code, updateError.message, updateError.details)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[capture-edit]', err)
    return NextResponse.json({ error: 'Failed to capture edit' }, { status: 500 })
  }
}
