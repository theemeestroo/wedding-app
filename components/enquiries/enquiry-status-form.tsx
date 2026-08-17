'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ENQUIRY_STATUSES, type EnquiryStatus } from './enquiry-status-badge'
import type { Dictionary } from '@/lib/i18n'

export function EnquiryStatusForm({
  dict,
  enquiryId,
  status,
  followUpDate,
  nextAction,
}: {
  dict: Dictionary
  enquiryId: string
  status: EnquiryStatus
  followUpDate: string | null
  nextAction: string | null
}) {
  const router = useRouter()
  const d = dict.enquiries.detail
  const supabase = createClient()

  const [statusValue, setStatusValue] = useState<EnquiryStatus>(status)
  const [followUp, setFollowUp] = useState(followUpDate ?? '')
  const [action, setAction] = useState(nextAction ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase
      .from('enquiries')
      .update({
        status: statusValue,
        follow_up_date: followUp || null,
        next_action: action || null,
      })
      .eq('id', enquiryId)

    setSaving(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="grid gap-3 rounded-2xl border bg-card p-6 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="enq-status" className="text-sm font-medium">{d.statusLabel}</label>
        <select
          id="enq-status"
          value={statusValue}
          onChange={(e) => setStatusValue(e.target.value as EnquiryStatus)}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        >
          {ENQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {dict.enquiries.statuses[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="enq-followup" className="text-sm font-medium">{d.followUpDateLabel}</label>
        <input
          id="enq-followup"
          type="date"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="enq-action" className="text-sm font-medium">{d.nextActionLabel}</label>
        <input
          id="enq-action"
          type="text"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder={d.nextActionPlaceholder}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
      </div>
      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
        >
          {saving ? dict.common.saving : dict.common.save}
        </button>
      </div>
    </form>
  )
}
