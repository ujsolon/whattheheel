# Spine Pair Review — What the Heel

## Overall verdict

**Adequate, leaning strong.** This is a real contract: a dev — human or AI — could open these two files and build from them without inventing much. Shape is canonical in both files, every `{path.to.token}` reference resolves, both PRD journeys have proper flows with named protagonists and climax beats, and the register split (hype vs. plain) is the kind of load-bearing decision most spines leave implicit.

Four things block a clean source-extraction: one component token specifies a color pair at 2.61:1 contrast, the polling screen — the judge-facing centerpiece — has no defined behavior for a dropped request or expired session, the mockup-vs-spine precedence rule is never stated despite the spines deliberately departing from the mockup in four places, and `epics.md` still declares that no UX contract exists for this project, so a story-dev consumer entering through epics never learns these files are here.

Nothing here is a rewrite. The high findings are each a paragraph or a token value.

## 1. Flow coverage — adequate

Extracted from `sources`: PRD Journey 1 (Trend Discovery, Anonymous) and Journey 2 (Premium AI-Stylist, Registered); FR-01…FR-06; architecture AD-1…AD-7; epics Stories 1.1–2.5.

Both PRD journeys have a Key Flow with a named protagonist (Priya, Jordan), numbered steps, an explicit **Climax** beat, and a failure path — Flow 1 as a trailing branch, Flow 2 as an in-line failure-and-recovery at step 5 that then continues to success. That is the right shape, and Flow 2's decision to route the failure *through* the flow rather than append it is better than the calibration examples.

### Findings

- **medium** No flow covers the returning registered user. Flow 2 opens at registration; the sign-in path, the Profile surface, and selfie *replacement* all exist in the IA table ("Profile → Selfie Upload … Profile ('add/change photo')", EXPERIENCE.md:36) but appear in no flow step anywhere. Story 2.1 covers login as well as registration and would be built blind. *Fix:* extend Flow 2 step 1 with a one-line sign-in variant, or add a short third flow for return-visit → Profile → change selfie.
- **medium** "Chosen fresh" trend selection on AI Stylist is named but never specified. EXPERIENCE.md:37 says the surface lets the user "Pick a trend (carried over from Feed selection or chosen fresh)", and Interaction Primitives:112 requires every surface to "tolerate its absence and fall back to 'no trend pre-selected'" — but no flow step, no Component Patterns row, and no State Patterns row says what the fresh-selection UI *is*. Story 2.3 builds this screen. *Fix:* one Component Patterns row — inline mini-grid reusing the trend card, or a link back to Feed — plus a State Patterns row for "no trend carried over".
- **low** Flow titles paraphrase rather than quote the source journey names ("Flow 1 — Anonymous discovery & preview" vs. PRD "Journey 1: Trend Discovery (Anonymous)"). *Fix:* carry the PRD's names verbatim in the heading so the trace back to source is mechanical.

## 2. Token completeness — adequate

Extracted all 50 distinct `{…}` references across both files and resolved each against DESIGN.md's frontmatter. **Every reference resolves.** Every color token carries a hex value. `spacing.5` is defined but never referenced (harmless). EXPERIENCE.md's token references all resolve to DESIGN.md tokens by name — no invented tokens, no drift.

Contrast is the weak edge. This is a dark-mode-only neon palette, and the load-bearing combinations are mostly excellent — but they are asserted qualitatively, never measured, and one of them is wrong. Computed:

| Pair | Ratio |
|---|---|
| `{colors.lime}` on `{colors.ink}` | 17.13:1 |
| `{colors.on-paper}` on `{colors.lime}` (badge, buy-now, active tab) | 17.13:1 |
| `{colors.on-ink}` on `{colors.ink-raised}` | 18.26:1 |
| `{colors.lime}` on `{colors.ink-raised}` | 15.80:1 |
| `{colors.purple}` meta on `{colors.paper}` | 5.85:1 |
| `{colors.error}` on `{colors.ink-raised}` | 5.58:1 |
| **`{colors.on-ink}` on `{colors.orange}` (`badge-fire`)** | **2.61:1** |

### Findings

- **high** `badge-fire` specifies white on orange at 2.61:1 — below even the 3:1 large-text floor, and the fire count is content (the trend's heat signal), not decoration (DESIGN.md:99–103). *Fix:* flip `foreground` to `{colors.on-paper}` — 7.59:1, stays entirely inside the existing palette, and matches how `badge` already handles its own fill.
- **medium** EXPERIENCE.md's Accessibility Floor states "Visual contrast values live in `DESIGN.md`" (EXPERIENCE.md:118), but DESIGN.md contains no ratio anywhere — the delegation resolves to nothing, and the reader who follows it finds only prose adjectives. *Fix:* add the table above (or the four load-bearing rows) to DESIGN.md Colors. It costs five lines and makes the one failing pair visible instead of latent.
- **low** The stated rationale for banning pink text is factually wrong for half its cases: DESIGN.md:190 says pink "does not hold contrast well enough against either ink or paper," but pink on ink measures 6.4:1 (passes) — it is pink on *paper* that fails at 3.09:1. The rule is correct; the reason a downstream consumer would reason from is not. *Fix:* restate as "pink on paper fails (3.1:1); reserved for shadows/badges regardless."
- **low** `{components.trend-card}.shadow` (DESIGN.md:233) is malformed reference syntax — the path escapes the braces, so a resolver returns the whole component object. Separately, `🔥{count}` (EXPERIENCE.md:83) and `/stylist?trend={id}` (EXPERIENCE.md:112) collide with the reference syntax and will be picked up by any consumer walking `{…}`. *Fix:* `{components.trend-card.shadow}`; escape or reword the two placeholders.

## 3. Component coverage — adequate

Every component in DESIGN.md's `components` frontmatter has visual prose in DESIGN.md.Components except `focus-ring`. Every EXPERIENCE.md Component Patterns row has a DESIGN.md counterpart. Behavioral rules are genuinely behavioral — the polling row commits to a 2s interval, a copy rotation, and a 30s escalation; the Buy Now row commits to hidden-not-disabled; the upload row commits to server-authoritative validation. No one-word descriptions anywhere.

### Findings

- **medium** Systematic name drift between the two spines. `trend-card` / "Trend feed card"; `upload-dropzone` / "Upload control"; `overlay-canvas` / "`OverlayCanvas.tsx`"; `buy-now-button` / "Buy Now link"; `inline-error` / "Inline error component"; `nav-tab-bar` / "Bottom tab bar / top nav"; `vto-result-photo` / "VTO result display"; `vto-progress-bar` / "VTO polling / loading state". Five of the nine EXPERIENCE.md rows carry no `{components.*}` token at all, so the behavior→visual join is by inference rather than by name. *Fix:* put the token in the Component column of every row, as the `auth-form`, polling, and result rows already do.
- **medium** `marquee` has a visual spec (DESIGN.md:235) and drives the opening beat of Flow 1, but has **no** Component Patterns row — nothing on content source, loop speed, pause-on-hover/focus, or reduced-motion. The same gap covers the cycling status copy and the looping progress fill: neither spine mentions `prefers-reduced-motion` anywhere, and this system has three continuously animating elements. *Fix:* one Component Patterns row for marquee, plus one Accessibility Floor bullet — under reduced-motion, marquee holds static, status copy swaps on poll response only, progress bar goes static-indeterminate.
- **low** `focus-ring` is a frontmatter component with no row in DESIGN.md.Components; its visual spec (3px lime, 2px offset) lives only in EXPERIENCE.md's Accessibility Floor — visual detail in the behavior spine. *Fix:* one Components bullet in DESIGN.md; EXPERIENCE.md keeps the behavioral half (when focus is shown).

## 4. State coverage — thin

Walked all ten IA surfaces. State Patterns covers Feed (empty, cold-load), polling, the AI Stylist gate, upload validation error, VTO failure, overlay success, registration/login error, selfie-saved success, and VTO success. Focus is handled in Accessibility Floor. Permission-denied is correctly absent — the native file input decision (memlog) means the product never requests a camera permission, and that's an explicit choice, not an omission.

The hole is everything network-shaped.

### Findings

- **high** No offline, network-failure, or timeout state exists anywhere in either spine. The polling row commits to "the screen simply resolves to Result or Failure whenever the poll returns a terminal status" (EXPERIENCE.md:85) — a dropped request, a 401 from an expired session, or a task that never reaches a terminal status has no defined UI, and there is no upper bound past the 30s "Still working — hang tight" line. The realistic demo failure is a judge on venue wifi sitting in front of a progress bar forever. *Fix:* add two State Patterns rows — poll request fails (retry N times, then plain-register "We lost the connection — tap to retry"), and elapsed > ~90s (surface the same retry). Both reuse `{components.inline-error}`; no new component.
- **medium** **Profile** is an IA surface with zero State Patterns rows — no cold-load, no "no selfie on file yet" (distinct from the AI Stylist gate, which redirects), no sign-out confirmation or post-sign-out destination. *Fix:* three rows; Profile is the smallest surface in the product and this is cheap.
- **medium** Neither of the two slowest server actions has an in-progress state. Selfie upload to Cloudinary and registration/login submit both round-trip, and nothing specifies what the button or dropzone shows meanwhile — so double-submit is unguarded on the account-creation path. *Fix:* one State Patterns row covering both: control disables and swaps to plain-register in-progress copy until the response lands.
- **low** `trends.json` failing to load has no state — only "Empty (no trends)" is covered, which is the different case of a successful fetch returning nothing. *Fix:* fold into the same row, or state that the two share treatment.

## 5. Visual reference coverage — thin

`.working/` contains four files: `direction-bold-streetwear.html` (chosen), `direction-editorial-minimal.html`, `direction-glossy-premium.html`, `direction-playful-pun.html`.

### Findings

- **high** Spines-win-on-conflict is never stated — not in DESIGN.md, not in EXPERIENCE.md. This matters more here than it usually would, because DESIGN.md *deliberately departs* from the chosen mockup in at least four places: it adds `{colors.error}` and `{typography.body}` that the mockup has no equivalent for, it excludes the mockup's phone-bezel rounding as device chrome, and it demotes the −6deg skew to a one-off. A consumer who opens the HTML — which is the most concrete artifact in the folder, and the one an AI implementer will happily copy from — has no rule telling them the markdown wins. *Fix:* one sentence in DESIGN.md Brand & Style: "`.working/direction-bold-streetwear.html` is the composition reference; this spine wins on conflict."
- **medium** The chosen direction is linked only inside a YAML comment (DESIGN.md:8) — no body section links it, and EXPERIENCE.md never names the file at all, even while citing "the chosen direction mockup's own copy" as the source of its entire hype-register table (EXPERIENCE.md:50). *Fix:* inline link at DESIGN.md Brand & Style ("feed hero composition, sticker/marquee treatment") and at EXPERIENCE.md Voice and Tone ("source of the hype-register strings").
- **low** Five references to "the mockup" (DESIGN.md:204, 217, 223, 227, 239) name neither the file nor what it illustrates. Individually fine; collectively they assume a reader who already knows which of the four files is meant. *Fix:* name the file on first use per section.
- **low** Three orphans — the rejected directions are referenced by neither spine. This is correct for `.working` residue and the rejection is recorded in `.memlog.md`; noted only for completeness, no action needed.

## 6. Bloat & overspecification — strong

Both files are dense with decisions and thin on filler. DESIGN.md carries editorial voice, as it should — the "drop, not a catalog" framing and the maximalist/plain split are doing real work, not decorating. EXPERIENCE.md stays out of that register except its Voice and Tone preamble, which earns the exception by arguing for the split rather than performing it. Tables are used where tables belong. No pixel spec appears where a token exists. No section here would go unread by a downstream consumer.

### Findings

- **low** Flow 2 step 1 restates architecture internals — `POST /api/auth/register`, bcryptjs hashing, "no adapter, no OAuth (architecture AD-7)", JWT session. That is AD-7's contract verbatim, now maintained in two files. The flow needs only "he completes sign-up and is signed in immediately." *Fix:* cut to the user-visible outcome and keep the AD-7 citation.
- **low** The non-grid width cap is stated twice with two different numbers — "~400-480px" (DESIGN.md:217) and "~480px" (EXPERIENCE.md:132) — with DESIGN.md simultaneously declaring that "this file governs appearance only" and delegating breakpoints to EXPERIENCE.md. *Fix:* pick one number; keep it in DESIGN.md (it is appearance) and have EXPERIENCE.md reference rather than restate.

## 7. Inheritance discipline — adequate

All four `sources` paths resolve to real files. The glossary is consistent across both spines and against sources — Trendsetter Feed, AI Stylist, Profile, Overlay Preview, VTO, trend, selfie all used identically. FR-01…FR-06, AD-2…AD-7, and Story 2.1–2.5 identifiers are all cited correctly and all exist in the named source. The style-picker note flagged by the earlier epics reconciliation has been correctly closed out.

### Findings

- **high** `epics.md` still declares "No UX design contract exists for this project (skipped in favor of going straight to architecture)" (epics.md:12) and "UX Design Requirements — N/A" (epics.md:50), while EXPERIENCE.md:44 asserts that epics.md has been reconciled against this spine. A story-dev consumer who enters through epics.md — the natural entry point for story execution — reads an explicit statement that these files do not exist. *Fix:* update both lines in `epics.md` to point at this spine pair; this is the single highest-leverage fix in the review because it is what makes the contract *reachable*.
- **low** "Resolves architecture's Deferred 'Polling UX during VTO inference' item" (EXPERIENCE.md:85) cites an item that has already been removed from `ARCHITECTURE-SPINE.md`'s Deferred list. The claim was true when written and the resolution is real, but the cross-reference now points at nothing in the current file. *Fix:* reword to "Concretizes what the architecture left deferred," or drop the pointer.
- **low** NFR numbering is attributed to the wrong source: "(PRD NFR3)" (EXPERIENCE.md:23) and "(NFR1)" (EXPERIENCE.md:38). The PRD's non-functional requirements are unnumbered prose headings — NFR1/NFR3 exist only in `epics.md`. A consumer opening the PRD to check will not find them. *Fix:* cite as "PRD NFR — UX" / "PRD NFR — Performance", or attribute to epics.md.
- **low** `epics.md`:46 still lists "polling UX copy" and "NextAuth session strategy (JWT vs DB sessions)" among open deferred items; both are now decided (here and in AD-7 respectively). Same reconciliation pass as the finding above.

## 8. Shape fit — strong

DESIGN.md carries all eight canonical sections in canonical order: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. Frontmatter uses every spec'd key correctly — flat kebab-case `colors`, nested `typography` objects with the spec'd subkeys, `rounded` with `full: 9999px` per convention, `spacing` with numbered levels plus a named `section` token, and `components` mapping names to `{path.to.token}` references that the resolver can flatten.

EXPERIENCE.md carries all eight required defaults — Foundation, Information Architecture, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows — with Key Flows last. Responsive & Platform is correctly present, triggered by the mobile/desktop split; the calibration example correctly omits it as single-surface, and this product correctly does not. Inspiration & Anti-patterns is omitted, which is right — it earns its place only when rejections are load-bearing, and here the rejected directions live in `.memlog.md` where they belong.

No findings.

## Mechanical notes

**Frontmatter.** Both files complete and mutually consistent: `name` ('What the Heel'), `status: draft`, `created`/`updated` (2026-08-17) match across the pair. EXPERIENCE.md correctly carries `design_ref: 'DESIGN.md'` and a four-entry `sources` list; all four paths resolve. DESIGN.md correctly carries no `sources` (it inherits from the direction file, cited in-comment). `ARCHITECTURE-SPINE.md` lists both spines under `companions`, so the link is bidirectional.

**Reference resolution.** 50 distinct `{…}` references extracted across both files; 50 resolve. Two false positives are prose placeholders that collide with the syntax (`{count}`, `{id}` — see §2). One malformed path (`{components.trend-card}.shadow`, DESIGN.md:233). `spacing.5` is defined and never referenced.

**Name inconsistencies.** Eight component-name mismatches between DESIGN.md tokens and EXPERIENCE.md Component Patterns rows (enumerated in §3). No glossary or domain-term drift — surface names, FR ids, AD ids, and Story ids are consistent across both spines and all four sources.

**Broken or stale cross-refs.** Three, all low: the removed architecture Deferred item (EXPERIENCE.md:85), the PRD NFR numbering (EXPERIENCE.md:23, :38), and EXPERIENCE.md:118's contrast delegation to a DESIGN.md section that states no values. One stale claim in a *source* rather than in the spines: `epics.md` still declares no UX contract exists (§7, high).

**Numbers verified.** All hex values in DESIGN.md frontmatter match the prose restatements in the Colors section exactly. All six locked error strings in EXPERIENCE.md's Voice and Tone match the PRD's VTO Error Handling block verbatim, including the em-dashes and the `invalid_parameter` not-user-facing carve-out.
