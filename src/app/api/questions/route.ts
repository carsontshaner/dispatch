import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

const TONE_LABELS: Record<string, string> = {
  warm: 'Warm & personal',
  professional: 'Professional & polished',
  playful: 'Fun & playful',
  direct: 'Straight to the point',
}

const SYSTEM_PROMPT = `You are a newsletter editor helping a small business owner write a weekly \
email. You have received their basic inputs. Your job is to identify 1-2 specific details that \
are missing and would make the newsletter feel more real and specific — not generic follow-ups, \
but targeted questions based on exactly what they wrote.

Rules for your questions:
- Only ask for factual details the owner actually knows
- Never ask how they feel about something
- Never ask them to describe their brand or voice
- Questions should be answerable in one sentence
- If their inputs are already specific enough, return only one question
- Never ask more than two questions total
- Return your response as a JSON object in this exact format:
  { "questions": ["question one", "question two"] }
- Return only the JSON. No explanation, no preamble.`

export async function POST(request: Request) {
  try {
    const { businessName, businessType, weeklyUpdate, promotions, cta, tone } =
      await request.json()

    const userMessage = [
      `Business: ${businessName} (${businessType})`,
      `Tone: ${TONE_LABELS[tone] ?? TONE_LABELS.warm}`,
      ``,
      `What happened this week: ${weeklyUpdate}`,
      promotions ? `Promotions or offers: ${promotions}` : null,
      `What the owner wants customers to do: ${cta}`,
    ]
      .filter(line => line !== null)
      .join('\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const result = JSON.parse(raw)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[questions]', err)
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }
}
