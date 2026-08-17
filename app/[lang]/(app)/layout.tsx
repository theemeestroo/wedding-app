import { redirect } from 'next/navigation'
import { hasLocale, getDictionary } from '@/lib/i18n'
import { I18nProvider } from '@/lib/i18n-context'
import { ProjectProvider } from '@/lib/project-context'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProject } from '@/lib/project'
import { AppNav } from '@/components/nav/app-nav'

export default async function AppLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) redirect('/en/dashboard')

  const dict = await getDictionary(lang)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // proxy.ts already guards this route group, but the layout needs the
  // user regardless to look up their project.
  if (!user) redirect(`/${lang}/auth/login`)

  const project = await getCurrentProject(supabase, user.id)
  if (!project) redirect(`/${lang}/projects/new`)

  return (
    <I18nProvider dict={dict}>
      <ProjectProvider project={project}>
        <div className="min-h-screen">
          <AppNav lang={lang} />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </div>
      </ProjectProvider>
    </I18nProvider>
  )
}
