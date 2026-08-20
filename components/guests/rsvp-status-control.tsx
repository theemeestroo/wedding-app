import type { Dictionary } from '@/lib/i18n'

export type RsvpStatus = 'not_invited' | 'invited' | 'attending' | 'declined'

export const RSVP_STATUSES: RsvpStatus[] = ['not_invited', 'invited', 'attending', 'declined']

const RSVP_STYLES: Record<RsvpStatus, string> = {
  not_invited: 'bg-muted text-muted-foreground',
  invited: 'bg-amber-100 text-amber-800',
  attending: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-destructive/10 text-destructive',
}

export function RsvpBadge({ dict, status }: { dict: Dictionary; status: RsvpStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${RSVP_STYLES[status]}`}>
      {dict.guests.rsvp[status]}
    </span>
  )
}

/** Inline-editable version of RsvpBadge — a native select painted as the same badge. */
export function RsvpStatusControl({
  dict,
  status,
  onChange,
}: {
  dict: Dictionary
  status: RsvpStatus
  onChange: (next: RsvpStatus) => void
}) {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as RsvpStatus)}
      className={`shrink-0 rounded-full border-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-gold/40 ${RSVP_STYLES[status]}`}
    >
      {RSVP_STATUSES.map((s) => (
        <option key={s} value={s}>
          {dict.guests.rsvp[s]}
        </option>
      ))}
    </select>
  )
}
