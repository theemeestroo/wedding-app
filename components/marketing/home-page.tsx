import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Logo } from '@/components/logo'
import { LaurelDivider } from '@/components/shared/laurel-divider'
import { ArchPanel } from '@/components/shared/arch-panel'
import type { Dictionary } from '@/lib/i18n'

/**
 * Shared marketing homepage — rendered by both the bare app/page.tsx (English
 * only, reached only before proxy.ts's locale redirect resolves) and the
 * localized app/[lang]/page.tsx. All copy comes from dict.home; only the
 * hrefs differ between the two callers, so those are passed in as props
 * rather than computed here.
 */
export function HomePage({
  d,
  loginHref,
  signupHref,
  privacyHref,
}: {
  d: Dictionary['home']
  loginHref: string
  signupHref: string
  privacyHref: string
}) {
  return (
    <div className="min-h-screen">
      <SiteHeader d={d} loginHref={loginHref} signupHref={signupHref} />
      <main>
        <Hero d={d} signupHref={signupHref} loginHref={loginHref} />
        <HowItWorks d={d} />
        <Features d={d} />
        <ClosingCta d={d} signupHref={signupHref} />
      </main>
      <SiteFooter d={d} privacyHref={privacyHref} loginHref={loginHref} />
    </div>
  )
}

function SiteHeader({
  d,
  loginHref,
  signupHref,
}: {
  d: Dictionary['home']
  loginHref: string
  signupHref: string
}) {
  return (
    <header className="border-b bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="#" className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-heading text-xl italic tracking-tight">Aisle</span>
        </Link>
        <nav className="flex items-center gap-6">
          <a
            href="#how-it-works"
            className="hidden text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            {d.navFeatures}
          </a>
          <Link
            href={loginHref}
            className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {d.navSignIn}
          </Link>
          <Link
            href={signupHref}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90"
          >
            {d.navGetStarted}
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Hero({
  d,
  signupHref,
  loginHref,
}: {
  d: Dictionary['home']
  signupHref: string
  loginHref: string
}) {
  return (
    <section className="paper-grain relative overflow-hidden border-b">
      <div className="gradient-hero absolute inset-0 opacity-[0.05]" />
      <div className="dot-pattern absolute inset-0 opacity-30" />
      <div className="relative mx-auto grid max-w-6xl gap-16 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-32">
        <div>
          <p className="mb-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-primary">
            <span className="h-px w-9 bg-primary/50" aria-hidden="true" />
            {d.heroEyebrow}
          </p>
          <h1 className="font-heading text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.5rem]">
            {d.heroTitleLead} <em className="italic text-primary">{d.heroTitleAccent}</em>
          </h1>
          <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            {d.heroSubtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href={signupHref}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90"
            >
              {d.heroCtaPrimary}
            </Link>
            <Link
              href={loginHref}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              {d.heroCtaSecondary}
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">{d.heroNote}</p>
        </div>

        <div className="relative mx-auto w-full max-w-sm pb-14 sm:pb-20 lg:mx-0">
          <ArchPanel align="start" className="h-[24rem] w-full sm:h-[27rem]" />
          <div className="absolute -bottom-14 left-1/2 w-[94%] -translate-x-1/2 sm:-bottom-20">
            <CompareMockup d={d} />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Illustrative "compare two options" panel — decorative, not live data. */
function CompareMockup({ d }: { d: Dictionary['home'] }) {
  return (
    <div className="invite-frame relative -rotate-1 rounded-2xl border bg-card p-5 shadow-xl shadow-primary/10 sm:p-6">
      <div className="space-y-4">
        <MockupOptionRow
          d={d}
          name={d.mockupOptionA}
          cost="€14,200 – 19,800"
          guests="86"
          hard="4"
          confidence={d.mockupConfidence}
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {d.mockupCompareCta}
          <span className="h-px flex-1 bg-border" />
        </div>
        <MockupOptionRow
          d={d}
          name={d.mockupOptionB}
          cost="€21,600 – 26,400"
          guests="86"
          hard="11"
          confidence={d.mockupConfidenceAlt}
          accent
        />
      </div>
    </div>
  )
}

function MockupOptionRow({
  d,
  name,
  cost,
  guests,
  hard,
  confidence,
  accent,
}: {
  d: Dictionary['home']
  name: string
  cost: string
  guests: string
  hard: string
  confidence: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-secondary/60' : 'bg-background'}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-heading text-base italic">{name}</span>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          {confidence}
        </span>
      </div>
      <dl className="space-y-3 text-sm">
        <MockupStat label={d.mockupCostLabel} value={cost} tabular large />
        <div className="grid grid-cols-2 gap-3">
          <MockupStat label={d.mockupGuestsLabel} value={guests} tabular />
          <MockupStat label={d.mockupTravelLabel} value={hard} tabular />
        </div>
      </dl>
    </div>
  )
}

function MockupStat({
  label,
  value,
  large,
  tabular,
}: {
  label: string
  value: string
  large?: boolean
  tabular?: boolean
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`font-semibold ${large ? 'text-base' : ''} ${tabular ? 'tabular-nums' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

function HowItWorks({ d }: { d: Dictionary['home'] }) {
  const steps = [
    { title: d.howStep1Title, body: d.howStep1Body },
    { title: d.howStep2Title, body: d.howStep2Body },
    { title: d.howStep3Title, body: d.howStep3Body },
    { title: d.howStep4Title, body: d.howStep4Body },
  ]

  return (
    <section id="how-it-works" className="border-b bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-4xl italic tracking-tight sm:text-5xl">{d.howHeading}</h2>
          <LaurelDivider className="mt-6" />
          <p className="mt-6 text-sm text-muted-foreground sm:text-base">{d.howSubheading}</p>
        </div>

        <ol className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className={`relative ${i % 2 === 1 ? 'lg:mt-10' : ''}`}>
              <span className="numeral-ghost block text-6xl leading-none sm:text-7xl">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Features({ d }: { d: Dictionary['home'] }) {
  const features = [
    { title: d.feature1Title, body: d.feature1Body },
    { title: d.feature2Title, body: d.feature2Body },
    { title: d.feature3Title, body: d.feature3Body },
    { title: d.feature4Title, body: d.feature4Body },
    { title: d.feature5Title, body: d.feature5Body },
    { title: d.feature6Title, body: d.feature6Body },
  ]

  return (
    <section className="relative border-b bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-4xl italic tracking-tight sm:text-5xl">{d.featuresHeading}</h2>
          <LaurelDivider className="mt-6" />
          <p className="mt-6 text-sm text-muted-foreground sm:text-base">{d.featuresSubheading}</p>
        </div>

        <div className="mt-16 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              style={{ '--scallop-bg': 'var(--secondary)' } as CSSProperties}
              className="scallop-bottom relative rounded-t-2xl border border-b-0 bg-card px-6 pb-8 pt-6 shadow-sm shadow-primary/5"
            >
              <FeatureMark rotate={i * 23} />
              <h3 className="mt-4 pr-8 text-sm font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureMark({ rotate = 0 }: { rotate?: number }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="absolute right-6 top-6 text-primary/50"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" fill="currentColor" />
    </svg>
  )
}

function ClosingCta({ d, signupHref }: { d: Dictionary['home']; signupHref: string }) {
  return (
    <section className="ink-band paper-grain relative overflow-hidden">
      <div className="dot-pattern absolute inset-0 opacity-[0.08]" />
      <div className="relative mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 sm:py-32">
        <LaurelDivider className="mb-8 justify-center text-primary" />
        <h2 className="font-heading text-4xl italic tracking-tight sm:text-5xl">{d.closingHeading}</h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {d.closingBody}
        </p>
        <Link
          href={signupHref}
          className="mt-9 inline-flex items-center justify-center rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90"
        >
          {d.closingCta}
        </Link>
      </div>
    </section>
  )
}

function SiteFooter({
  d,
  privacyHref,
  loginHref,
}: {
  d: Dictionary['home']
  privacyHref: string
  loginHref: string
}) {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <div className="flex items-center gap-2.5">
          <Logo size={22} />
          <span className="text-sm text-muted-foreground">{d.footerTagline}</span>
        </div>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link href={privacyHref} className="transition-colors hover:text-foreground">
            {d.footerPrivacy}
          </Link>
          <Link href={loginHref} className="transition-colors hover:text-foreground">
            {d.navSignIn}
          </Link>
        </div>
      </div>
    </footer>
  )
}
