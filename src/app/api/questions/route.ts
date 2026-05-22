import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { MODEL } from '@/lib/version'

const client = new Anthropic()

const TONE_LABELS: Record<string, string> = {
  warm: 'Warm & personal',
  professional: 'Professional & polished',
  playful: 'Fun & playful',
  voice: 'Find my voice',
}

const LENGTH_GUIDANCE: Record<string, string> = {
  short: 'Ask 1-2 follow-up questions. Only the most important missing details.',
  medium: 'Ask 2-4 follow-up questions. Look for details that would add texture and specificity.',
  lengthy: 'Ask 3 or more follow-up questions. Dig into backstory, process, and context that \
would make the newsletter feel rich and lived-in.',
}

function buildSystemPrompt(newsletterLength: string): string {
  const guidance = LENGTH_GUIDANCE[newsletterLength] ?? LENGTH_GUIDANCE.short
  const lengthLabel = newsletterLength.charAt(0).toUpperCase() + newsletterLength.slice(1)

  return `You are a newsletter editor helping a small business owner write a weekly email. You \
have received their basic inputs. Your job is to identify specific details that are missing and \
would make the newsletter feel more real and specific — not generic follow-ups, but targeted \
questions based on exactly what they wrote.

The desired newsletter length is ${lengthLabel}. ${guidance}

Rules for your questions:
- Only ask for factual details the owner actually knows
- Never ask how they feel about something
- Never ask them to describe their brand or voice
- Questions should be answerable in one sentence
- Return your response as a JSON object in this exact format:
  { "questions": ["question one", "question two"] }
- Return only the JSON. No explanation, no preamble.
- Return only raw JSON. No markdown. No code fences. No backticks. The first character of your \
response must be { and the last must be }.`
}

export async function POST(request: Request) {
  try {
    const { businessName, businessType, weeklyUpdate, promotions, cta, tone, newsletterLength } =
      await request.json()

    const userMessage = [
      `Business: ${businessName} (${businessType})`,
      `Tone: ${TONE_LABELS[tone] ?? TONE_LABELS.warm}`,
      `Newsletter length: ${newsletterLength ?? 'short'}`,
      ``,
      `What happened this week: ${weeklyUpdate}`,
      promotions ? `Promotions or offers: ${promotions}` : null,
      `What the owner wants customers to do: ${cta}`,
    ]
      .filter(line => line !== null)
      .join('\n')

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: buildSystemPrompt(newsletterLength ?? 'short'),
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = message.content
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { type: string; text?: string }) => block.text ?? '')
      .join('')

    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[questions]', err)
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }
}
