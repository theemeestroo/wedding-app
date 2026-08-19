'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'
import { RATINGS, type RatingRow, type RatingValue } from './shared'

export function OptionDecisionTab({
  dict,
  option,
  projectId,
  ratings,
  memberNames,
  currentUserId,
  isDecided,
  decisionRationale,
  canDecide,
}: {
  dict: Dictionary
  option: { id: string }
  projectId: string
  ratings: RatingRow[]
  memberNames: Record<string, string>
  currentUserId: string
  isDecided: boolean
  decisionRationale: string | null
  canDecide: boolean
}) {
  const router = useRouter()
  const d = dict.options.detail
  const supabase = createClient()

  const myRating = ratings.find((r) => r.profile_id === currentUserId) ?? null
  const othersRatings = ratings.filter((r) => r.profile_id !== currentUserId)
  const [ratingValue, setRatingValue] = useState<RatingValue>(myRating?.rating ?? 'like')
  const [ratingNote, setRatingNote] = useState(myRating?.note ?? '')
  const [savingRating, setSavingRating] = useState(false)

  async function handleSaveRating(e: React.FormEvent) {
    e.preventDefault()
    setSavingRating(true)
    await supabase.from('ratings').upsert(
      { option_id: option.id, profile_id: currentUserId, rating: ratingValue, note: ratingNote || null },
      { onConflict: 'option_id,profile_id' },
    )
    setSavingRating(false)
    router.refresh()
  }

  const [rationale, setRationale] = useState(isDecided ? decisionRationale ?? '' : '')
  const [savingDecision, setSavingDecision] = useState(false)

  async function handleRecordDecision(e: React.FormEvent) {
    e.preventDefault()
    setSavingDecision(true)
    await supabase.from('decisions').upsert(
      { project_id: projectId, option_id: option.id, rationale: rationale || null },
      { onConflict: 'project_id' },
    )
    setSavingDecision(false)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.ratingsHeading}</h2>

        <form onSubmit={handleSaveRating} className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRatingValue(r)}
                className={
                  'rounded-lg border px-3 py-1.5 text-sm font-medium ' +
                  (ratingValue === r ? 'border-primary bg-primary/10' : 'bg-background hover:bg-muted')
                }
              >
                {d.ratingLabels[r]}
              </button>
            ))}
          </div>
          <textarea
            value={ratingNote}
            onChange={(e) => setRatingNote(e.target.value)}
            placeholder={d.ratingNotePlaceholder}
            rows={2}
            className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <button
            type="submit"
            disabled={savingRating}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {savingRating ? dict.common.saving : myRating ? d.updateRating : d.saveRating}
          </button>
        </form>

        <div className="space-y-2">
          {othersRatings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{myRating ? d.noOtherRatingsYet : d.rateToRevealOthers}</p>
          ) : (
            othersRatings.map((r) => (
              <div key={r.id} className="rounded-xl border bg-card px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{memberNames[r.profile_id] || d.unknownMember}</span>
                  <span className="text-xs text-muted-foreground">{d.ratingLabels[r.rating]}</span>
                </div>
                {r.note && <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>}
              </div>
            ))
          )}
        </div>
      </section>

      {canDecide && !isDecided && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.decisionHeading}</h2>
          <form onSubmit={handleRecordDecision} className="space-y-2 rounded-xl border bg-card p-4">
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder={d.rationalePlaceholder}
              rows={2}
              className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            <button
              type="submit"
              disabled={savingDecision}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {savingDecision ? dict.common.saving : d.recordDecision}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
