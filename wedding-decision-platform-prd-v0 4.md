# Wedding Decision Platform
## Product Requirements Document — v0.4

**Status:** Definition
**Product type:** Collaborative wedding decision platform
**Wedge:** Destination and venue-led weddings, 30–150 guests, geographically distributed guest base
**Supersedes:** v0.2 (discovery), v0.3 (structural refinement), Addendum A (logistics)

---

# 1. Vision

Most wedding products become useful *after* a couple has decided the broad shape of their wedding. This product owns the stage before that.

A couple may simultaneously be weighing 35 guests at an Italian villa, 60 at a dedicated wedding venue, 90 at a hotel and 120 closer to home — with a different guest list, a different cost structure and a completely different travel burden behind each one.

These are not separate decisions. They form a chain:

**Guest list → travel feasibility → attendance → venue → accommodation → catering → transport → total cost**

Every existing tool manages the links as separate lists. This product treats them as one connected model.

> **Figure out the right wedding before you start organising it.**

The lifecycle is **Discover → Save → Enquire → Model → Compare → Decide**, and the product deliberately stops at Decide. Everything after that is a solved market.

## 1.1 The one-line scope test

*Does this help the couple choose between options they currently cannot compare?* If no, it's out of v1 — however obviously wedding-ish it is.

---

# 2. Market gap

Existing platforms are strong at vendor discovery, guest lists, RSVP, invitations, seating, websites, checklists, budgets and registries. All of that assumes the wedding is already defined.

Before it's defined, couples are asking:

- How many people should we invite, and who's in if we go smaller?
- Which venues actually work for each guest-count option?
- What does each venue really cost once everything is included?
- Where would everyone stay, and how hard is each option to reach?
- Have we contacted this property, and what did they say?
- Which option do we both actually prefer?

They currently answer this with spreadsheets, bookmarks, Notes, WhatsApp, email, PDFs, marketplace favourites and shared documents. The product replaces that with one connected system.

---

# 3. Product principles

## 3.1 Everything is connected

A guest is not a row. A guest affects: guest plan → travel difficulty → likely attendance → capacity → catering → accommodation → transport → cost.

A venue is not a bookmark. A venue affects: capacity → accommodation → suppliers → restrictions → travel burden → cost.

An enquiry is not a note. An enquiry affects: availability → confirmed pricing → restrictions → option viability → decision.

## 3.2 The venue is not the listing

One property may exist as an Airbnb listing, an official site, a Booking.com page, an Instagram profile, a marketplace listing, a Google Maps entry and a PDF brochure. These are **Sources** belonging to one **Venue**. Never create duplicate venue records because several URLs exist.

## 3.3 Nothing is certain, so say how certain it is

Every number carries a confidence level and provenance. A single precise total assembled from guesses is worse than a range, because it invites decisions it can't support.

## 3.4 Show the trade-off, don't make the choice

The product's job is to make consequences visible — what an option costs in money, in guest travel, in who can realistically attend. It should never nag a couple toward the "efficient" wedding. Plenty of people will happily accept a harder, costlier option for the wedding they want. They should simply know the number.

---

# 4. Seven pillars

| Pillar | Purpose |
|---|---|
| **Guests** | The universe of people who could be invited, and where they'd travel from |
| **Guest Plans** | Named guest configurations — small, medium, large |
| **Venues** | Structured records with multiple sources, facts and documents |
| **Enquiries** | Lightweight CRM for venue conversations, quotes and follow-ups |
| **Logistics** | How location affects the whole group's travel, and who it affects |
| **Costs** | Rule-based, confidence-aware, comparable total cost |
| **Comparison** | Quantitative and qualitative side-by-side, ending in a decision |

Logistics is a pillar rather than a report because it feeds back into headcount and cost. It is an input, not an output.

---

# 5. Jobs to be done

1. Help us decide how big our wedding should be.
2. Help us determine who's invited at each size.
3. Give us one place for every venue we're considering.
4. Track who we've contacted, what we asked and what they replied.
5. Compare venues whose pricing structures are completely different.
6. Tell us what each option realistically costs.
7. Show us where guests would stay.
8. Show us how hard each location is for our guests — and for whom.
9. Help us understand where we *should* be looking, given where everyone lives.
10. Help both partners compare preferences and reach a decision.

---

# 6. Primary user

A couple in early planning who has not selected a venue, is considering several destinations and multiple wedding sizes, has an approximate budget, and — critically — has **guests spread across multiple countries or regions**.

The geographic spread is the strongest qualifying signal. A couple whose guests all live within an hour of each other has a much simpler problem and doesn't need this product. A couple with family in three countries has a problem no spreadsheet solves.

**Target segment:** destination or venue-led weddings, 30–150 guests, distributed guest base.

---

# 7. Data model

```
Project
 ├── Member                     2 partners (owner / partner / viewer)
 │
 ├── Guest ── Household ── Tier (A/B/C/D, customisable)
 │    └── origin: city, country → geocoded → OriginCluster
 │
 ├── OriginCluster              derived, editable
 ├── GuestPlan ── GuestPlanRule (include tier / group / exception)
 │
 ├── Venue
 │    ├── VenueSource           url, platform, price shown, last checked
 │    ├── VenueContact
 │    ├── VenueFact             each with confidence + provenance
 │    ├── Gateway               airport/station serving this venue + transfer leg
 │    └── Document              brochure, quote, menu, contract
 │
 ├── Enquiry ── EnquiryEvent    timeline
 ├── Quote
 ├── Accommodation              venue rooms / hotels / villas
 │
 ├── Option = GuestPlan × Venue × Date
 │    ├── CostRule              basis, rate, applies-when, confidence
 │    ├── CostLine              DERIVED — never stored as truth
 │    ├── Journey               per OriginCluster → Gateway
 │    ├── Rating                per member
 │    └── Allocation            guest → accommodation
 │
 └── Decision                   chosen option, date, rationale
```

## 7.1 The Option — the central structural decision

An **Option is Guest Plan × Venue × Date**. This is the single most important change from v0.2, where `Scenario` held both the guest configuration and the venue.

The real question is a grid: four guest configurations across six candidate venues is twenty-four combinations. If each is a self-contained scenario, changing one guest tier means editing twenty-four records, and the model collapses under exactly the workload the product exists to handle.

Separating them means: Guest Plans are maintained once; Options are cheap to create; duplicating an Option means swapping one dimension; and sensitivity analysis — *"at what guest count does Villa A stop being cheaper?"* — falls out naturally by holding the venue fixed and sweeping the plan.

## 7.2 VenueFact as an object, not columns

Storing each venue fact (capacity, curfew, catering policy, coach access) as a row rather than a column lets every fact carry its own confidence and provenance, and lets the app generate *"here's what we still don't know about this venue"* without a hardcoded question list. That list then feeds enquiry generation automatically.

## 7.3 Households, not guests, for travel

A family of four from Manchester is **one journey with four seats**. They book together, arrive together, need one car or four coach seats, and decline together. Model travel at household level and inherit down. This also halves the data entry burden.

---

# 8. Confidence model

Four levels, applied uniformly to costs, venue facts and journeys.

| Level | Band | Meaning |
|---|---|---|
| **Guess** | ±40% | Nobody has checked; heuristic or template default |
| **Researched** | ±20% | From a listing, brochure, or comparable venue |
| **Confirmed** | ±5% | The venue said it in writing |
| **Contracted** | 0% | It's in a signed document |

Every value carries provenance: who, when, which document, which email.

Totals render as ranges: **€41k – €52k, most likely €46k**, with a confidence bar — never a falsely precise €46,300.

This unlocks the most useful sentence the product can say:

> **The biggest unknown in this option is catering. Confirming it would narrow your range by €6,000.**

That drives the next enquiry, which drives engagement, which is the retention loop during the search phase.

---

# 9. Cost engine

## 9.1 Rules, not items

Store the formula and derive the number. A **Cost Rule** has:

- **basis** — `fixed` · `per adult` · `per guest` · `per child` · `per room` · `per room-night` · `per person-night` · `per hour` · `% of subtotal`
- **rate** and currency
- **applies-when** condition — *only if external catering* · *only if guests > 80* · *only in high season*
- **confidence** and **provenance**
- **owner** — attached to a Venue, a Guest Plan, or an Option

An Option's cost is produced by evaluating every applicable rule against that Option's headcount, nights and date. Change the plan from 64 to 80 and every dependent line moves on its own.

`CostLine` is always derived. Never write it as authoritative, or you'll get drift between the stored number and the rules.

## 9.2 Hidden Cost Templates

The promise of "comparable total wedding cost" fails on day one, because a couple pricing a €9,000 Italian villa doesn't know the €9,000 is roughly a third of the real total.

Ship a library of **venue archetypes**, each carrying the cost lines it implies:

> **Bare villa, external catering**
> venue hire · catering · staff · furniture and tableware hire · marquee or wet-weather cover · generator · portable bathrooms · lighting · cleaning · security deposit · licensed planner (often mandatory) · music licence · tourist tax · welcome dinner · transport between accommodation and venue

> **All-inclusive wedding venue**
> package rate · guest overage rate · drinks upgrade · ceremony fee · supplier corkage · overtime rate

> **Hotel wedding**
> minimum spend · room block commitment · per-person F&B · service charge · AV · cake cutting fee

Selecting an archetype pre-populates the Option at `Guess` confidence with typical regional rates. The couple confirms, edits or deletes each line.

This makes the cost engine useful before any real data exists, delivers the "we had no idea" moment that gets a product recommended, and seeds the structured dataset the long-term moat depends on. It's largely content work rather than engineering, which makes it unusually cheap for its impact.

## 9.3 Comparable total

Venue hire + accommodation + catering + drinks + furniture + staff + transport + cleaning + ceremony fee + required suppliers + taxes + other mandatory costs = **Comparable Wedding Cost**, expressed as a range, with per-guest and per-adult derivations.

This is what stops apparently cheap venues looking artificially attractive.

---

# 10. Logistics engine

## 10.1 What to capture

**Mandatory — and this is all you should ever require:**

| Field | Notes |
|---|---|
| Home city | Free text with autocomplete |
| Home country | ISO code |

**Derived automatically:** coordinates (geocoded, cached), primary departure airport, up to three alternates, drive time to each, origin cluster assignment.

**Optional, prompted only where it would change something:**

| Field | Why |
|---|---|
| Nationality / passport country | Visa requirements and lead times |
| Mobility constraints | Long connections or coach transfers may be unworkable |
| Travelling with infants | Sharply changes route tolerance |
| Has a car / willing to drive | A 6-hour drive is fine for some households, impossible for others |
| Max acceptable travel time | Turns feasibility from a guess into a stated fact |
| Likely nights staying | Drives accommodation demand |
| Who pays | Couple-funded, guest-funded, or split |
| Leave constraints | Determines whether a Friday wedding is viable |

**Entry design:** city and country sit in the main guest table. Everything else comes from a *"12 households need travel details"* prompt that walks only through the households where the answer would change an outcome.

## 10.2 Origin Clusters — the piece that makes this tractable

Do not compute routes per guest per venue. Ninety guests across twelve venues is 1,080 calculations, most identical, all expensive.

Roll households into **Origin Clusters** — groups sharing a departure catchment:

```
OriginCluster
  ├── label             "North West England (MAN)"
  ├── departure_airport MAN  (+ alternates LPL, LBA)
  ├── centroid          lat/lng
  ├── households        6
  ├── guests            14  (11 adults, 3 children)
  ├── tier_mix          A:4 B:7 C:3
  ├── flags             2 households with mobility constraints
  └── visa_required_for [destination countries]
```

Generated automatically, **always editable** — the couple knows things the geocoder doesn't.

Travel analysis then runs **clusters × destination gateways**, not guests × venues. Eight clusters against twelve venues is 96 cacheable lookups — and because venues cluster geographically, five Tuscan villas share one route analysis, differing only in the final transfer leg.

This is the architectural decision that makes the whole pillar affordable.

## 10.3 The Journey

For each Origin Cluster → Gateway pair:

```
Journey
  ├── mode               fly / drive / rail / mixed
  ├── legs               home→airport · flight(s) · airport→venue
  ├── connections        0 / 1 / 2
  ├── door_to_door_time  including check-in and transfer buffers
  ├── cost_per_person    seasonal estimate + confidence
  ├── arrival_window     typical arrival times on the target day
  ├── transfer           gateway → venue distance and drive time
  └── flags              no_direct_route · overnight_required ·
                         arrives_after_2300 · visa_required ·
                         exceeds_stated_max_time · no_viable_route
```

**Door-to-door is the number that matters**, not flight time. A 2-hour flight with a 90-minute drive each end plus check-in is a 7-hour day. Couples systematically underestimate this, and showing the honest figure is a large part of the value.

## 10.4 Difficulty bands

| Band | Definition |
|---|---|
| **Easy** | Under 4h door-to-door, direct or driving |
| **Moderate** | 4–8h, at most one connection |
| **Hard** | Over 8h, or two-plus connections, or arrival after 23:00 |
| **Blocked** | No viable route, visa lead time missed, or exceeds a stated maximum |

## 10.5 Three feedback loops

**Travel difficulty → attendance.** Feed each cluster's difficulty and cost into the attendance model. A household facing 11 hours and €890 each declines far more often than one driving 40 minutes. Expected headcount changes, and every per-guest cost line changes with it. Result: *"this venue is €4,000 cheaper, but you'd expect eleven fewer guests."*

**Arrival profile → transfer costs.** Once you know 31 guests land at Bari on Friday afternoon within a five-hour window, coach requirements are derivable — one 50-seat coach plus two cars, or three minibuses. Generate these as Cost Rules at `Guess` confidence.

**Stay length → accommodation cost.** Expected nights per cluster produces room-night demand, priced against real accommodation records rather than a guessed average.

## 10.6 Data sources

Resist reaching for live flight data first. It's the most expensive and least necessary piece.

| Need | v1 | Later |
|---|---|---|
| Geocoding | Nominatim (free, OSM) or MapTiler; cache aggressively | Google Geocoding |
| Airport database | OurAirports open dataset, filtered to scheduled commercial service | — |
| Route existence | Static direct-route table, refreshed manually for target regions | Amadeus Self-Service API (free tier, airport-routes endpoint) |
| Flight cost | Heuristic: distance band × season multiplier × direct/connection factor, tuned against real searches | Amadeus flight offers |
| Drive times | OSRM (self-hostable) or MapTiler/Mapbox directions | Google Distance Matrix |

**The honest v1 position:** heuristic estimates marked `Guess`, with a "check real prices" link out to a flight search. Couples don't need booking-grade accuracy to choose a venue. They need to know whether it's a 3-hour trip or an 11-hour one, and roughly whether it's €120 or €700. Heuristics get that right often enough, at a fraction of the effort. Guest-confirmed bookings upgrade the data to `Confirmed` over time.

---

# 11. Centre of Gravity and the Travel Map

This is the product's signature capability, and the thing no competitor attempts.

## 11.1 The core idea

Compute the headcount-weighted geographic centroid of the guest base, then show which regions minimise total group travel:

> Your guests' centre of gravity is near **Frankfurt**.
> Marrying within 3 hours of there means 78% of guests reach you in a single short hop.
> Your current Puglia shortlist averages 6h20 door-to-door — **412 extra guest-hours** of travel.

This inverts the product. Instead of only evaluating venues the couple already found, it tells them **where to look**.

## 11.2 Guest-hours as the unit

One number, comparable across every Option: **total hours your guests will collectively spend travelling.**

> Puglia: 1,140 guest-hours · Bavaria: 428 guest-hours

Intuitive, aggregates cleanly, and makes an abstract trade-off concrete in a way per-guest averages don't. Use it as the headline metric throughout the logistics pillar.

## 11.3 The map — layer by layer

The visualisation is built from five layers, each independently toggleable.

### Layer 1 — Guest cluster bubbles

One bubble per Origin Cluster, positioned at the cluster centroid.

- **Radius** proportional to √headcount (square root, so a 40-person cluster doesn't swamp a 5-person one)
- **Fill colour** by difficulty band relative to the currently selected venue — green Easy, amber Moderate, orange Hard, red Blocked
- **Label** on hover or above the bubble: region name and headcount ("North West England · 14")
- **Grey/neutral** when no venue is selected, so the map reads as pure geography before you start comparing

### Layer 2 — The burden surface

The strongest version of the idea, and the one worth building properly.

Sample a coarse grid across the candidate region — 0.5° spacing across Europe is roughly 4,000 points. For each grid point, compute total guest-hours from every cluster using the heuristic journey model. Render the result as a smooth heat surface: **cool where the group travels least, warm where it travels most.**

The effect is a "gravity well" centred slightly off the true centroid — pulled toward wherever the airports actually are. Couples see instantly that a band across southern Germany and northern Italy is cheap in travel terms while the Algarve is expensive, without anyone having to tell them.

It's pure arithmetic on data you already hold — no API calls, fully cacheable, recomputed only when the guest plan changes. Render as a raster overlay or a contour set; contours read more cleanly at low zoom.

### Layer 3 — Coverage rings

Concentric rings centred on the **centre of gravity**, labelled by *coverage* rather than distance:

> ○ Inner ring — **within 4h door-to-door for 62% of guests**
> ○ Middle ring — **within 6h for 84%**
> ○ Outer ring — **within 8h for 96%**

Rings are the intuitive part, but distance rings alone would be dishonest — a ring drawn at 800km means very different things toward London than toward the Adriatic, because air links differ. So compute each ring as the contour where cumulative coverage crosses the threshold, derived from the same surface as Layer 2. They'll come out as soft irregular blobs rather than perfect circles, which is both more truthful and more visually distinctive.

If that's too much for v1, ship true circles with an explicit caveat in the legend, and upgrade later.

### Layer 4 — Flow lines

Curved lines from each cluster to the selected venue.

- **Width** proportional to headcount
- **Colour** matching the cluster's difficulty band
- **Animated dash** on the hard and blocked routes only — motion draws the eye exactly where the problem is
- Great-circle curvature rather than straight lines; it looks like travel rather than like a network diagram

### Layer 5 — Markers

- **Centre of gravity** — a distinct, understated marker; a crosshair or small target rather than a pin, so it doesn't read as a recommended venue
- **Candidate venues** — one pin per shortlisted Option, the selected one emphasised
- **The gap line** — a dashed line between the centre of gravity and the selected venue, labelled with the cost of the difference: *"+412 guest-hours vs. the optimum"*

That gap line is the single most communicative element on the screen.

## 11.4 Interactions

| Interaction | Effect |
|---|---|
| **Select a venue** | All clusters recolour by difficulty, flow lines redraw, gap line updates. Animate the transition — watching bubbles shift from green to orange as you switch from Bavaria to Puglia is the moment the feature lands. |
| **Guest plan switcher** | Small / medium / large. Bubbles resize and some disappear entirely; the centre of gravity moves. Shows how inviting the C tier pulls the optimum toward wherever those people live. |
| **Hover a cluster** | Panel showing who's in it, the route, door-to-door time, cost per person, and any flags |
| **Click a cluster** | Filters the guest list to those households |
| **Compare mode** | Two venues side by side, or one map with A/B toggle. Side-by-side reads better for two; the toggle is better for three or more. |
| **Drop a pin** | Click anywhere on the map to see what a wedding there would mean — guest-hours, difficulty split, coverage. This turns the map into an exploration tool rather than a report, and it's cheap once the surface exists. |

## 11.5 The panel beside the map

The map answers "where", the panel answers "who". Keep them side by side, always:

> **Villa Bellavista · Puglia · 64 guests**
> 1,140 guest-hours · median 6h20 door-to-door · €480 per guest
> Easy 31 · Moderate 24 · Hard 12 · **Blocked 2**
>
> **Hardest for:**
> · Nowak household (4) — 11h, two connections
> · Margaret Hill (1) — mobility constraint, no direct route
> · Atlanta group (5) — €890 each, overnight required
> · Sharma household (3) — Schengen visa, 6 weeks needed, 4 remaining
>
> **Burden split:** your side median 2h10 · their side median 8h40

Naming people is uncomfortable and exactly right. Couples avoid this conversation because they can't quantify it. The list is what stops the product feeling like a spreadsheet with charts.

## 11.6 Technical approach

**Recommendation: MapLibre GL JS**, with vector tiles from MapTiler's free tier or self-hosted Protomaps. Open source, no Mapbox pricing exposure, and it handles the layer types you need — fill-extrusion, heatmap, line, symbol — natively on the GPU. `react-map-gl` wraps it cleanly for Next.js.

Practical notes:

- Compute the burden surface **server-side** and cache it per guest plan. It changes only when guests or the plan change, so it's a good fit for a cached Supabase function or a Vercel edge route.
- Serve the surface as GeoJSON contours rather than a raster where possible — smaller, sharper, and styleable client-side.
- Precompute cluster-to-gateway journeys and store them; never compute routes in the browser.
- **Fallback for v1:** if the surface proves fiddly, ship Layers 1, 4 and 5 with a plain basemap. Bubbles, flow lines and the gap line alone deliver most of the communicative value. Add the surface and the coverage rings in a second pass.

## 11.7 Framing and tone

Present the centre of gravity as information, never instruction. Never *"you're choosing wrong"* — always *"here's what this costs your group"*. Plenty of couples will happily accept 412 extra guest-hours for the wedding they want, and the product should not nag. Test this wording carefully; it's the one feature here that could land badly if the copy tips into judgement.

---

# 12. Enquiry CRM

Every venue has an enquiry with a status pipeline: *not contacted → drafting → sent → awaiting response → replied → follow-up required → quote received → viewing booked → shortlisted / no availability / rejected / booked.*

Each enquiry holds a chronological timeline of events (email, call, WhatsApp, viewing, quote, availability result), a follow-up date, a next action, and attached documents.

**Do not send email from the app in v1.** Outbound mail from a new domain lands in spam, and venue replies go to the couple's own inbox anyway. Instead:

- Generate the message from the venue's unanswered facts plus the Option's parameters, always editable
- Provide a Copy button and a `mailto:` link
- Issue each project a unique inbound address (`proj-a1b2@in.yourdomain.com`) that the couple BCCs or forwards replies to

That gives you an auto-populating timeline with no OAuth, no deliverability risk and no Google verification review — for a small amount of inbound-parse webhook work. It's the highest stickiness-per-hour item in the whole build.

---

# 13. Comparison and decision

## 13.1 The compare screen

| | Villa Italy | Venue Italy | Germany |
|---|---:|---:|---:|
| Guests invited / expected | 42 / 38 | 68 / 61 | 110 / 104 |
| Venue | €9,000 | €14,000 | €11,000 |
| Catering | €7,200 | €10,200 | €15,000 |
| Accommodation | €6,000 | €7,500 | €2,000 |
| Transport | €2,500 | €3,500 | €800 |
| Other | €12,000 | €13,000 | €16,000 |
| **Total (range)** | **€33–41k** | **€44–53k** | **€41–49k** |
| Cost per expected guest | €965 | €790 | €430 |
| **Guest-hours** | **1,140** | **1,140** | **428** |
| Direct-route coverage | 44% | 44% | 81% |
| Guests in Hard/Blocked | 14 | 14 | 3 |
| Guest cost burden | €480 | €480 | €140 |
| Confidence | Medium | High | Low |
| Partner ratings | ❤️ / 👍 | 👍 / 😐 | 😐 / ❤️ |

Plus non-financial rows: weather risk, date availability, accommodation difficulty, budget fit.

## 13.2 Break-even and sensitivity

Hold the venue fixed, sweep guest count, plot total cost per venue:

> **Villa Bellavista is cheaper than Tenuta Verde up to 71 guests. Above that, Tenuta Verde wins.**

An afternoon's work with Recharts once the cost engine is rule-based, and it answers the question couples circle for weeks without resolving.

## 13.3 The Decision Session

A guided, timeboxed flow that turns the hardest conversation into a product moment:

1. Both partners rate the shortlisted Options independently — **neither can see the other's ratings**
2. Reveal together: agreements, disagreements, and the size of each gap
3. For each disagreement, each partner writes one line on what matters most to them
4. The app summarises: where you agree, where you don't, what each option costs in money, in guest travel, and in the things you each said you valued
5. Record the Decision with a rationale; project state changes to Decided

This is the moment worth telling friends about, and the natural end of the funnel.

## 13.4 Collaboration throughout

Both partners have full access. Each can rate venues, options and locations independently (❤️ / 👍 / 😐 / 👎 plus a note). The app surfaces mutual favourites, disagreements, and a combined ranking.

---

# 14. AI structuring

Used to remove typing, never to make decisions.

- **URL capture** — server-side Open Graph fetch (title, image, description) for any URL. Cheap, reliable, and it doesn't depend on scraping listing sites, which Airbnb and Booking.com both block and prohibit.
- **Assisted extraction** — paste page text or upload a screenshot, brochure, price sheet or quote → extract venue facts and cost lines at `Researched` confidence
- **Email parsing** — forwarded venue replies become suggested fact updates and timeline entries
- **Enquiry generation** — built from unanswered venue facts plus the Option's parameters

**Every extracted field is confirmed by the user before it's saved.** The confirmation UI *is* the product here, not the model call. Silent auto-fill destroys trust the first time it's wrong, and it will be wrong.

---

# 15. Dashboard and navigation

**Navigation:** Home · Guests · Plans · Venues · Enquiries · Options · Compare · Map

Enquiries stays first-class rather than buried inside Venues. Map is its own destination because the logistics view is a genuine reason to open the app.

**Dashboard** — decisions and activity, not generic wedding tasks:

> 67 potential guests across 8 regions in 5 countries
> 3 guest plans · 13 saved venues · 9 costed options
> 7 venues contacted · 3 awaiting reply · 2 follow-ups due · 4 quotes received
>
> **Actions required**
> Follow up with Villa Bellavista — no response for 6 days
> Review quote from Tenuta Verde — expires in 8 days
> Villa Rosa needs information — music curfew and catering policy unknown
> 4 households need travel details to complete the map
>
> **Current shortlist:** Villa Bellavista · Tenuta Verde · Schloss Example

---

# 16. Build sequence

Seven phases. Each ends with something a real couple could use, which is what lets you test with actual people rather than waiting nine months for a launch.

The stack (Next.js, Supabase, Vercel, Tailwind, shadcn/ui, Recharts) fits well, and the Letly work already produced patterns for row-level security, multi-user access and currency handling that lift across with light edits. A project here is a two-person household rather than a tenant org, so the access model is simpler.

## Phase 0 — Foundation
Auth · project creation · invite-your-partner · row-level security · currency setup · app shell and empty states.

**Exit:** two people on two devices see the same empty project.
**Note:** get the invite flow right now. Retrofitting shared access is painful, and single-player wedding planning misses the point.

## Phase 1 — Venue Board
Manual venue creation · add-by-URL with Open Graph capture · multiple Sources per venue with "open original" always visible · board with cards and filters · venue detail page (Overview / Sources / Facts / Documents / Notes).

**Exit:** a couple can replace their bookmarks and shared Notes file.
**Why first:** lowest effort, highest immediate payoff. Three venues in and it already beats what they had. It earns you the right to ask for the guest list.

## Phase 2 — Enquiry CRM
Enquiry per venue with status pipeline · manual timeline events · follow-up dates · needs-attention widget · document upload · **unique project inbox address** for forwarded replies.

**Exit:** the dashboard can honestly say *"3 venues awaiting reply, 2 follow-ups due this week."*

## Phase 3 — Guests, Plans and Origins
Guest CRUD · households · groups · tiers · adult/child · **city and country capture with geocoding** · CSV import with a GUI column mapper · **automatic origin clustering, editable** · Guest Plans from tier and group rules with manual exceptions · live counters.

**Exit:** creating small/medium/large plans takes under five minutes once guests are in, and the app can say *"your guests come from 8 regions across 5 countries."*
**Note:** import quality is the whole battle. Fuzzy household detection — same surname, same address, suggest a household — saves enormous manual work and makes a strong first impression.

## Phase 4 — Options and the Cost Engine
Option creation from Guest Plan × Venue × Date · Cost Rules with all bases and applies-when conditions · **hidden cost templates by venue archetype** · derived breakdown by category · range output with confidence bar · "biggest unknown" callout linking to a draft enquiry.

**Exit:** changing a plan from 64 to 80 updates every dependent figure instantly and correctly.
**Note:** this is the riskiest phase and more work than 1–3 combined. Prototype the cost engine on paper, or literally in a spreadsheet, against one real villa quote before writing code.

## Phase 5 — Logistics and Compare
Journey computation per cluster × gateway · difficulty bands · Travel Load Score · guest-hours · **the map: bubbles, flow lines, venue markers, centre of gravity, gap line** · who-it's-hard-for panel · burden fairness split · side-by-side Option comparison · break-even chart · partner ratings · Decision Session · recorded Decision.

**Exit:** a couple can point at one screen and say "that's why we chose it."
**Note:** ship the map without the burden surface first. Bubbles and flow lines deliver most of the communicative value; the surface and coverage rings are a strong second pass.

## Phase 6 — AI structuring
Assisted extraction from text, screenshots, PDFs and brochures · quote parsing into Cost Rules · forwarded-email parsing · generated enquiry messages · confirmation UI throughout.

**Exit:** a 12-page Italian villa brochure becomes a costed Option in under three minutes.

## Phase 7 — Accommodation, transfers and depth
Accommodation records and allocation · arrival/departure profiles · coach and transfer planning with auto-generated cost rules · stay-length and room-night demand · **burden surface and coverage rings** · attendance forecast · visa and document lead-time tracking · legal ceremony feasibility by country.

**Exit:** *"72% of your guests can reach this venue on a direct flight; the average guest will spend €480 to attend."*

## Sequencing notes

- **Phases 1–2 are your first testable release.** Put it in front of three engaged couples before starting Phase 3. If venue-plus-enquiry tracking alone doesn't get weekly use, the deeper model won't rescue it.
- Phases 6 and 7 can be reordered based on what test couples complain about most.
- With AI-assisted development, keep each phase to vertical slices — one entity end to end (schema → security policy → API → screen) before starting the next. That produces far better output than building all the schema, then all the API, then all the UI.

---

# 17. Priority summary

**P0 — Essential:** project and shared access · guest list with origins · households and tiers · guest plans · venue records with multiple sources · venue facts with confidence · enquiry tracking and timeline · follow-ups · options · cost rules · comparable total as a range · option comparison · partner ratings · decision record.

**P1 — Strong candidates:** origin clustering · journeys and difficulty bands · the map (core layers) · guest-hours · centre of gravity · hidden cost templates · break-even chart · Decision Session · URL and document extraction · enquiry generation · project inbox address · quote management · shareable summary.

**P2 — Post-MVP:** burden surface and coverage rings · attendance forecast · accommodation optimiser · arrival profiles and transfer planning · visa lead times · legal feasibility · what-if engine · AI analyst · external venue intelligence.

---

# 18. Out of scope

Invitations · RSVP · wedding website · seating and table planning · gift registry · honeymoon · day-of schedule · photo sharing · supplier marketplace · payment processing · guest messaging.

And structurally: **anything requiring the venue to be a user of your platform.** Two-sided marketplaces are a different company.

---

# 19. Success metrics

| Stage | Metric | Target |
|---|---|---|
| Activation | 3 saved venues within 24h of signup | 50% |
| Depth | Guest list with origins for ≥80% of guests | 40% |
| Core value | ≥2 costed Options viewed side by side | 35% |
| Logistics engagement | Map opened ≥3 times in a project | 45% |
| Engagement | Enquiry status changes per active week | ≥3 |
| Conversion | Free → paid at the venue/option limit | 8–12% |
| Outcome | Projects reaching a recorded Decision | 25% |
| **Quality** | **Median gap between modelled and final contracted cost** | **<15%** |

That last one matters most long-term. If the estimates are close to reality, you have a defensible dataset. If they're not, you have a nicer spreadsheet.

---

# 20. Business model

**Free:** one project · guest list · up to 5 venues · 2 guest plans · 3 options · basic enquiry tracking · basic map.

**Premium — one-time, €69** (test €49 against €99): unlimited venues, plans and options · AI extraction · advanced cost modelling · full map with burden surface · attendance forecast · accommodation and travel planning · Decision Session · shareable summary.

A subscription will feel punitive for a product with a three-month useful life; a one-time unlock at the point where the free tier bites is the right shape. Willingness to pay is unusually price-insensitive relative to a €40k budget, and underpricing signals "toy".

**Later:** accommodation affiliate revenue · planner accounts · aggregated wedding-cost intelligence. Commercial relationships must never distort rankings.

---

# 21. Moat

Over time the structured dataset covers real venue economics: actual costs, hidden fees, catering rates, minimum spends, typical guest counts, required extras, availability patterns, restrictions, and final wedding totals — plus, uniquely, **real travel burden data by origin and destination.**

That eventually supports:

> Couples planning 60–70 guest weddings at this venue typically spend €42k–€48k.

> This venue's advertised price represents about 35% of the likely total.

> Weddings in this region see a 31% decline rate for guests travelling from the UK.

Nobody else will have the third one.

---

# 22. Risks and open questions

**Distribution is the real risk, not the build.** People need this once, briefly, at an unpredictable moment. That means content and search — *"what does a wedding in Puglia actually cost"*, *"villa wedding hidden costs"*, *"where should we hold a wedding if our families are in different countries"* — rather than a launch. The cost templates and the centre-of-gravity concept are both excellent article material, which is worth exploiting deliberately.

**Short customer lifetime.** Mitigated by the one-time price and by the shareable summary, which is the only natural growth loop: parents who are contributing money want to see the options, and right now that happens over WhatsApp screenshots.

**GDPR.** You'll store names, home cities, relationships and a children flag for up to 150 people who never consented, under German jurisdiction. Household contact lists are defensible under legitimate interest, but you need a deletion path, an export, a plain-language notice, and a policy of not retaining guest records after a project is deleted. Decide this in Phase 3, not after your first real user. If you later want the aggregated dataset, make it anonymous, opt-in, and stated in the policy from day one rather than changing terms afterwards.

**Cold start on cost data.** The archetype templates are the bridge. Be honest in the UI that early figures are typical rather than actual.

**Multi-day weddings — unresolved.** Destination weddings almost always run across welcome dinner, wedding day and farewell brunch, with different guest counts and costs per day. Modelling only the wedding day may understate totals by 20–30%. An Option probably needs to hold a small set of events with their own counts and cost rules — but that's a real increase in Phase 4 scope, and it's worth deciding deliberately rather than by accident.

**Guest self-service — unresolved.** A shared link where guests confirm their departure city, nights staying and rough costs would produce far better data than the couple guessing. But it means contacting guests before the venue is chosen, which many couples won't want. Design it as an optional late-stage tool, not a core input path.

**Return journeys.** Usually symmetric, so one journey doubled is fine for v1 — except where Sunday departures are constrained, which the arrival profile already catches.

**Origin precision.** City-level is enough for airport assignment and drive times, and is a realistic thing to know about 90 people. Postcode-level would improve accuracy by perhaps 20 minutes and would never get filled in. Recommend city-level and stop there.
