import Link from 'next/link'
import { localizePath } from '@/lib/locale'

export interface VenueCardData {
  id: string
  name: string
  location_city: string | null
  location_country: string | null
  status: 'considering' | 'shortlisted' | 'rejected'
  image_url: string | null
}

const STATUS_STYLES: Record<VenueCardData['status'], string> = {
  considering: 'bg-muted text-muted-foreground',
  shortlisted: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
}

export function VenueCard({ venue, lang }: { venue: VenueCardData; lang: string }) {
  const location = [venue.location_city, venue.location_country].filter(Boolean).join(', ')

  return (
    <Link
      href={localizePath(lang, `/venues/${venue.id}`)}
      className="block overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md"
    >
      {venue.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={venue.image_url} alt="" className="h-32 w-full object-cover" />
      ) : (
        <div className="h-32 w-full bg-muted" />
      )}
      <div className="space-y-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{venue.name}</h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[venue.status]}`}>
            {venue.status}
          </span>
        </div>
        {location && <p className="text-sm text-muted-foreground">{location}</p>}
      </div>
    </Link>
  )
}
