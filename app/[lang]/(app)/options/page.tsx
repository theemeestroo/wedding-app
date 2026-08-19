import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'

export const metadata = { title: 'Options — The Wedding Lab' }

export default async function OptionsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.options
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/auth/login`)

  const project = await getCurrentProject(supabase, user.id)
  if (!project) redirect(`/${lang}/projects/new`)

  const { data: options } = await supabase
    .from('options')
    .select('id, name, guest_plans(name), venues(name)')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{d.heading}</h1>
        <Link
          href={localizePath(lang, '/options/new')}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground border border-transparent transition-colors duration-300 hover:border-gold"
        >
          {d.createCta}
        </Link>
      </div>

      <ul className="space-y-2">
        {(options ?? []).map((o) => {
          const plan = Array.isArray(o.guest_plans) ? o.guest_plans[0] : o.guest_plans
          const venue = Array.isArray(o.venues) ? o.venues[0] : o.venues
          return (
            <li key={o.id}>
              <Link
                href={localizePath(lang, `/options/${o.id}`)}
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-shadow hover:shadow-md"
              >
                <span className="font-medium">{o.name || `${plan?.name ?? '—'} × ${venue?.name ?? '—'}`}</span>
                <span className="text-sm text-muted-foreground">
                  {plan?.name} · {venue?.name}
                </span>
              </Link>
            </li>
          )
        })}
        {(options?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </ul>
    </div>
  )
}
