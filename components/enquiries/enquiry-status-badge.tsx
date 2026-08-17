import type { Dictionary } from '@/lib/i18n'

export type EnquiryStatus =
  | 'not_contacted'
  | 'drafting'
  | 'sent'
  | 'awaiting_response'
  | 'replied'
  | 'follow_up_required'
  | 'quote_received'
  | 'viewing_booked'
  | 'shortlisted'
  | 'no_availability'
  | 'rejected'
  | 'booked'

export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  'not_contacted',
  'drafting',
  'sent',
  'awaiting_response',
  'replied',
  'follow_up_required',
  'quote_received',
  'viewing_booked',
  'shortlisted',
  'no_availability',
  'rejected',
  'booked',
]

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  not_contacted: 'bg-muted text-muted-foreground',
  drafting: 'bg-muted text-muted-foreground',
  sent: 'bg-amber-100 text-amber-800',
  awaiting_response: 'bg-amber-100 text-amber-800',
  replied: 'bg-sky-100 text-sky-800',
  follow_up_required: 'bg-amber-100 text-amber-800',
  quote_received: 'bg-sky-100 text-sky-800',
  viewing_booked: 'bg-sky-100 text-sky-800',
  shortlisted: 'bg-emerald-100 text-emerald-800',
  no_availability: 'bg-destructive/10 text-destructive',
  rejected: 'bg-destructive/10 text-destructive',
  booked: 'bg-primary/10 text-primary',
}

export function EnquiryStatusBadge({ dict, status }: { dict: Dictionary; status: EnquiryStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[status]}`}>
      {dict.enquiries.statuses[status]}
    </span>
  )
}
