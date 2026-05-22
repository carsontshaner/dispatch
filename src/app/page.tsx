'use client'

import { useState, useEffect, useRef } from 'react'

const TONES = [
  { id: 'warm', label: 'Warm & personal' },
  { id: 'professional', label: 'Professional' },
  { id: 'playful', label: 'Fun & playful' },
  { id: 'voice', label: 'Find my voice' },
]

const LENGTHS = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'lengthy', label: 'Lengthy' },
]

interface Output {
  subject: string
  body: string
}

type Step = 'idle' | 'fetching' | 'questions' | 'generating'

const PLACEHOLDER: Output = {
  subject: 'Your subject line will appear here',
  body: `Hi there,

Your newsletter will appear here once you fill in the form on the left and click Generate.

It'll be tailored to your business, written in the tone you choose, and ready to send.

Talk soon,
Your Business`,
}

export default function Home() {
  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    weeklyUpdate: '',
    promotions: '',
    cta: '',
    tone: 'warm',
    newsletterLength: 'short',
  })
  const [step, setStep] = useState<Step>('idle')
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [output, setOutput] = useState<Output | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [btnHovered, setBtnHovered] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [originalDraft, setOriginalDraft] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let id = sessionStorage.getItem('dispatch_session_id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('dispatch_session_id', id)
    }
    setSessionId(id)
  }, [])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [editedBody])

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function updateAnswer(i: number, value: string) {
    setAnswers(a => { const next = [...a]; next[i] = value; return next })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.tone === 'voice') return
    setStep('fetching')
    setError(null)
    setOutput(null)
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to fetch questions')
      const data = await res.json()
      const qs: string[] = data.questions ?? []
      setQuestions(qs)
      setAnswers(qs.map(() => ''))
      setStep('questions')
    } catch {
      setError('Something went wrong — please try again.')
      setStep('idle')
    }
  }

  async function handleGenerate() {
    setStep('generating')
    setError(null)
    try {
      const followUpAnswers = questions.map((question, i) => ({
        question,
        answer: answers[i] ?? '',
      }))
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, followUpAnswers, sessionId, generationId }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()
      setOutput({ subject: data.subject, body: data.body })
      setEditedSubject(data.subject)
      setEditedBody(data.body)
      setOriginalDraft(`Subject: ${data.subject}\n\n${data.body}`)
      if (data.generationId) setGenerationId(data.generationId)
      setStep('idle')
    } catch {
      setError('Something went wrong — please try again.')
      setStep('questions')
    }
  }

  async function handleCopy() {
    if (!output) return
    const finalText = `Subject: ${editedSubject}\n\n${editedBody}`
    await navigator.clipboard.writeText(finalText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    if (generationId) {
      fetch('/api/capture-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId, finalText }),
      }).catch(err => console.error('[capture-edit]', err))
    }
  }

  const fromAddress = form.businessName
    ? `${form.businessName} <hello@${form.businessName.toLowerCase().replace(/\s+/g, '') + '.com'}>`
    : 'Your Business <hello@yourbusiness.com>'

  const isVoiceTone = form.tone === 'voice'
  const generateDisabled = step === 'fetching' || isVoiceTone
  const generateBg = step === 'fetching' ? '#4A8CB5' : isVoiceTone ? '#111111' : btnHovered ? '#5A9FD4' : '#69B3E7'
  const generateColor = isVoiceTone ? '#333333' : '#000000'
  const showQuestionCard = step === 'questions' || step === 'generating'

  return (
    <main style={s.root}>
      {/* ── Header ── */}
      <header style={s.header}>
        <span style={s.logoText}>
          <span style={{ color: '#F0F0F0' }}>DIS</span>
          <span style={{ color: '#69B3E7' }}>PATCH</span>
        </span>
        <span style={s.logoSub}>Newsletter Generator</span>
      </header>

      <div style={s.columns}>
        {/* ── Left: Form ── */}
        <div style={s.formPane}>
          <p style={s.sectionLabel}>Tell us about your week</p>
          <p style={s.paneDesc}>
            Fill in the details and we&apos;ll write a newsletter your customers will actually read.
          </p>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Business name" required>
                <Input
                  placeholder="e.g. Rosario's Deli"
                  value={form.businessName}
                  onChange={v => update('businessName', v)}
                />
              </Field>
              <Field label="Business type" required>
                <Input
                  placeholder="e.g. Italian restaurant"
                  value={form.businessType}
                  onChange={v => update('businessType', v)}
                />
              </Field>
            </div>

            <Field label="What happened this week?" required>
              <Textarea
                placeholder="New menu items, a busy weekend, a staff milestone, a local event you joined..."
                value={form.weeklyUpdate}
                onChange={v => update('weeklyUpdate', v)}
                rows={4}
              />
            </Field>

            <Field label="Any promotions or offers?">
              <Textarea
                placeholder="10% off Mon–Wed, free dessert with entrée, happy hour extended..."
                value={form.promotions}
                onChange={v => update('promotions', v)}
                rows={3}
              />
            </Field>

            <Field label="What do you want customers to do?" required>
              <Input
                placeholder="e.g. Book a table, visit us this weekend, use code SPRING25"
                value={form.cta}
                onChange={v => update('cta', v)}
              />
            </Field>

            <Field label="Tone">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TONES.map(t => (
                  <ToneButton
                    key={t.id}
                    label={t.label}
                    selected={form.tone === t.id}
                    onClick={() => update('tone', t.id)}
                  />
                ))}
              </div>
            </Field>

            {isVoiceTone && <FindMyVoiceCard />}

            <Field label="Newsletter Length">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {LENGTHS.map(l => (
                  <ToneButton
                    key={l.id}
                    label={l.label}
                    selected={form.newsletterLength === l.id}
                    onClick={() => update('newsletterLength', l.id)}
                  />
                ))}
              </div>
            </Field>

            {error && (
              <p style={{ color: '#E06050', fontSize: 12, margin: 0, fontFamily: MONO }}>
                {error}
              </p>
            )}

            {!showQuestionCard && (
              <button
                type="submit"
                disabled={generateDisabled}
                onMouseEnter={() => setBtnHovered(true)}
                onMouseLeave={() => setBtnHovered(false)}
                style={{
                  ...s.generateBtn,
                  backgroundColor: generateBg,
                  color: generateColor,
                  cursor: generateDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {step === 'fetching' ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={s.spinnerEl} />
                    <span style={{ color: '#A8A8A8' }}>Thinking...</span>
                  </span>
                ) : 'Generate My Newsletter'}
              </button>
            )}
          </form>

          {showQuestionCard && (
            <QuestionCard
              questions={questions}
              answers={answers}
              onChange={updateAnswer}
              onSubmit={handleGenerate}
              loading={step === 'generating'}
            />
          )}
        </div>

        {/* ── Right: Preview ── */}
        <div style={s.previewPane}>
          <div style={s.previewHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={s.previewLabel}>Live Preview</span>
              {output && step === 'idle' && (
                <span style={s.readyBadge}>
                  <span style={s.pulsingDot} />
                  Ready to Send
                </span>
              )}
            </div>
            {output && (
              <button
                onClick={handleCopy}
                style={{
                  ...s.copyBtn,
                  backgroundColor: copied ? '#69B3E7' : '#000000',
                  color: copied ? '#000000' : '#69B3E7',
                }}
              >
                {copied ? 'Copied' : 'Copy to Clipboard'}
              </button>
            )}
          </div>

          <div style={s.emailCard}>
            <div style={s.emailMeta}>
              <MetaRow label="From" value={fromAddress} monospace dim={!output} />
              {output ? (
                <MetaRow label="Subject" value={editedSubject} serif last onChange={setEditedSubject} />
              ) : (
                <MetaRow label="Subject" value={PLACEHOLDER.subject} serif dim last />
              )}
            </div>

            <div style={s.emailBody}>
              {step === 'fetching' ? (
                <ThinkingState />
              ) : step === 'generating' ? (
                <LoadingState />
              ) : output ? (
                <textarea
                  ref={bodyRef}
                  value={editedBody}
                  onChange={e => setEditedBody(e.target.value)}
                  style={s.editableBody}
                  spellCheck={false}
                />
              ) : (
                <pre style={{ ...s.bodyText, color: '#252525' }}>
                  {PLACEHOLDER.body}
                </pre>
              )}
            </div>
          </div>

          {step === 'idle' && !output && (
            <p style={s.hint}>Fill in the form to generate your newsletter.</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder, textarea::placeholder { color: #282828; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #1A1A1A; }
      `}</style>
    </main>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

const MONO = '"Courier New", Courier, monospace'

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={s.fieldLabel}>
        {label}
        {required && <span style={{ color: '#69B3E7', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ placeholder, value, onChange }: {
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      style={s.input}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={e => (e.target.style.borderColor = '#69B3E7')}
      onBlur={e => (e.target.style.borderColor = '#1A1A1A')}
    />
  )
}

function Textarea({ placeholder, value, onChange, rows }: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  rows: number
}) {
  return (
    <textarea
      style={{ ...s.input, resize: 'vertical', minHeight: rows * 26 }}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      onFocus={e => (e.target.style.borderColor = '#69B3E7')}
      onBlur={e => (e.target.style.borderColor = '#1A1A1A')}
    />
  )
}

function ToneButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: selected ? '#69B3E7' : '#000000',
        border: `1px solid ${selected ? '#69B3E7' : '#1A1A1A'}`,
        color: selected ? '#000000' : '#A8A8A8',
        padding: '10px 14px',
        fontSize: 11,
        fontWeight: selected ? 700 : 400,
        cursor: 'pointer',
        fontFamily: MONO,
        textAlign: 'left',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderRadius: 0,
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )
}

function QuestionCard({ questions, answers, onChange, onSubmit, loading }: {
  questions: string[]
  answers: string[]
  onChange: (i: number, v: string) => void
  onSubmit: () => void
  loading: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const QUESTION_LABELS: Record<number, string> = { 1: 'One quick thing', 2: 'Two quick things', 3: 'Three quick things', 4: 'Four quick things' }
  const label = QUESTION_LABELS[questions.length] ?? `${questions.length} quick things`
  const bg = loading ? '#4A8CB5' : hovered ? '#5A9FD4' : '#69B3E7'

  return (
    <div style={{ borderTop: '1px solid #1A1A1A', marginTop: 24, paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#69B3E7', fontFamily: MONO, margin: 0 }}>
        {label}
      </p>

      {questions.map((q, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 15, fontFamily: 'Georgia, serif', color: '#F0F0F0', lineHeight: 1.5, margin: 0 }}>
            {q}
          </p>
          <input
            style={s.input}
            value={answers[i] ?? ''}
            onChange={e => onChange(i, e.target.value)}
            onFocus={e => (e.target.style.borderColor = '#69B3E7')}
            onBlur={e => (e.target.style.borderColor = '#1A1A1A')}
            placeholder="Your answer..."
            disabled={loading}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...s.generateBtn,
          backgroundColor: bg,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={s.spinnerEl} />
            <span style={{ color: '#A8A8A8' }}>Writing...</span>
          </span>
        ) : 'Write My Newsletter'}
      </button>
    </div>
  )
}

function FindMyVoiceCard() {
  return (
    <div style={{
      border: '1px solid #1A1A1A',
      backgroundColor: '#0A0A0A',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#69B3E7', fontFamily: MONO }}>
        Coming Soon
      </span>
      <p style={{ fontSize: 14, fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#A8A8A8', lineHeight: 1.6, margin: 0 }}>
        Connect your website or social media and Dispatch will write in your exact voice — automatically.
      </p>
    </div>
  )
}

function MetaRow({ label, value, dim, last, monospace, serif, onChange }: {
  label: string
  value: string
  dim?: boolean
  last?: boolean
  monospace?: boolean
  serif?: boolean
  onChange?: (v: string) => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '10px 20px',
      backgroundColor: monospace ? '#0D0D0D' : 'transparent',
      borderBottom: last ? 'none' : '1px solid #1A1A1A',
    }}>
      <span style={{ fontSize: 10, color: '#383838', width: 54, flexShrink: 0, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {onChange ? (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: serif ? 14 : 12,
            fontFamily: serif ? 'Georgia, serif' : MONO,
            color: '#F0F0F0',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            padding: 0,
          }}
        />
      ) : (
        <span style={{
          fontSize: serif ? 14 : 12,
          fontFamily: serif ? 'Georgia, serif' : MONO,
          color: dim ? '#202020' : (serif ? '#F0F0F0' : '#666'),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {value}
        </span>
      )}
    </div>
  )
}

function ThinkingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
      <span style={{ color: '#3A3A3A', fontSize: 11, fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Thinking about what to ask...
      </span>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '24px 0' }}>
      <div style={{
        width: 26,
        height: 26,
        border: '2px solid #1A1A1A',
        borderTopColor: '#69B3E7',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }} />
      <span style={{ color: '#A8A8A8', fontSize: 11, fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Writing your newsletter...
      </span>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#000000',
    color: '#F0F0F0',
    fontFamily: 'Georgia, serif',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    borderBottom: '1px solid #1A1A1A',
    padding: '18px 40px',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#000000',
  },
  logoText: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '0.18em',
    fontFamily: MONO,
  },
  logoSub: {
    color: '#333',
    fontSize: 11,
    fontFamily: MONO,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    flex: 1,
    minHeight: 0,
  },
  formPane: {
    borderRight: '1px solid #1A1A1A',
    padding: '40px',
    overflowY: 'auto',
    backgroundColor: '#000000',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#69B3E7',
    fontFamily: MONO,
    marginBottom: 10,
  },
  paneDesc: {
    color: '#444',
    fontSize: 13,
    lineHeight: 1.65,
    marginBottom: 32,
    fontFamily: 'Georgia, serif',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#A8A8A8',
    fontFamily: MONO,
  },
  input: {
    backgroundColor: '#0D0D0D',
    border: '1px solid #1A1A1A',
    color: '#F0F0F0',
    padding: '10px 14px',
    fontSize: 14,
    fontFamily: 'Georgia, serif',
    outline: 'none',
    width: '100%',
    borderRadius: 2,
    transition: 'border-color 0.12s',
  },
  generateBtn: {
    width: '100%',
    color: '#000000',
    border: 'none',
    padding: '14px 24px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    transition: 'background-color 0.15s',
    fontFamily: MONO,
    borderRadius: 0,
  },
  spinnerEl: {
    display: 'inline-block',
    width: 13,
    height: 13,
    border: '2px solid rgba(169,169,169,0.2)',
    borderTopColor: '#69B3E7',
    borderRadius: '50%',
    animation: 'spin 0.75s linear infinite',
  },
  previewPane: {
    padding: '40px',
    overflowY: 'auto',
    backgroundColor: '#0A0A0A',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#69B3E7',
    fontFamily: MONO,
  },
  readyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    color: '#69B3E7',
    fontFamily: MONO,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  pulsingDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    backgroundColor: '#69B3E7',
    borderRadius: '50%',
    animation: 'pulse-dot 1.4s ease-in-out infinite',
  },
  copyBtn: {
    border: '1px solid #69B3E7',
    padding: '6px 14px',
    fontSize: 10,
    cursor: 'pointer',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontFamily: MONO,
    borderRadius: 0,
    transition: 'all 0.15s',
  },
  emailCard: {
    border: '1px solid #1A1A1A',
    backgroundColor: '#111111',
    boxShadow: '0 0 0 1px #1A1A1A',
  },
  emailMeta: {
    borderBottom: '1px solid #1A1A1A',
  },
  emailBody: {
    padding: '28px 32px',
  },
  bodyText: {
    fontFamily: 'Georgia, serif',
    fontSize: 15,
    lineHeight: 1.75,
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  editableBody: {
    fontFamily: 'Georgia, serif',
    fontSize: 15,
    lineHeight: 1.75,
    color: '#D0D0D0',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    width: '100%',
    padding: 0,
    margin: 0,
    resize: 'none',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    display: 'block',
  },
  hint: {
    marginTop: 14,
    color: '#252525',
    fontSize: 11,
    letterSpacing: '0.05em',
    fontFamily: MONO,
  },
}
