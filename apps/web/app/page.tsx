import Link from "next/link";
import { Bezel } from "@/components/Bezel";
import { Reveal } from "@/components/Reveal";

/* ---- inline line icons (no emoji, consistent 1.5 stroke) ---- */
const ico = "h-[22px] w-[22px] fill-none stroke-lime [stroke-width:1.5] [stroke-linecap:round] [stroke-linejoin:round]";
const ArrowUR = ({ dark = false }: { dark?: boolean }) => (
  <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] fill-none [stroke-width:1.5] [stroke-linecap:round] [stroke-linejoin:round] ${dark ? "stroke-ink" : "stroke-lime"}`}><path d="M7 17 17 7M9 7h8v8" /></svg>
);
const QrIcon = () => (<svg viewBox="0 0 24 24" className={ico}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v.01M14 21h.01M21 21v-4M17 21h1" /></svg>);
const UsersIcon = () => (<svg viewBox="0 0 24 24" className={ico}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>);
const CamIcon = () => (<svg viewBox="0 0 24 24" className={ico}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>);
const LayersIcon = () => (<svg viewBox="0 0 24 24" className={ico}><path d="M3 7h18M3 12h18M3 17h18" /></svg>);
const FaceIcon = () => (<svg viewBox="0 0 24 24" className={ico}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>);
const SearchIcon = () => (<svg viewBox="0 0 24 24" className={ico}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>);
const PinIcon = () => (<svg viewBox="0 0 24 24" className={ico}><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>);
const GaugeIcon = () => (<svg viewBox="0 0 24 24" className={ico}><path d="M12 14a6 6 0 1 0-6-6" /><path d="M12 14v-4l3-2" /><path d="M3 12a9 9 0 1 0 9-9" /></svg>);
const SparkIcon = () => (<svg viewBox="0 0 24 24" className={ico}><path d="M12 3v4M12 17v4M5 12H1M23 12h-4M6.3 6.3 3.5 3.5M20.5 20.5l-2.8-2.8M6.3 17.7l-2.8 2.8M20.5 3.5l-2.8 2.8" /><circle cx="12" cy="12" r="3" /></svg>);
const ShieldIcon = () => (<svg viewBox="0 0 24 24" className="h-[30px] w-[30px] fill-none stroke-lime [stroke-width:1.5] [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 3 4 6v6c0 5 3.4 7.6 8 9 4.6-1.4 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>);
const Check = () => (<svg viewBox="0 0 24 24" className="mt-0.5 h-[18px] w-[18px] shrink-0 fill-none stroke-lime [stroke-width:1.5] [stroke-linecap:round] [stroke-linejoin:round]"><path d="m5 12 5 5 9-11" /></svg>);

const Eyebrow = ({ children }: { children: string }) => (
  <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">{children}</p>
);

const STEPS = [
  { Icon: QrIcon, n: "01", t: "Host drops a QR", b: "Spin up an event in seconds. Print it, beam it, share the link." },
  { Icon: UsersIcon, n: "02", t: "Guests join", b: "No account. A name and a quick consent tap, and they are crew." },
  { Icon: CamIcon, n: "03", t: "Everyone shoots their POV", b: "Every guest's angle on the same moment, captured at once." },
  { Icon: LayersIcon, n: "04", t: "It all pools", b: "One live gallery, the whole night from every point of view.", hot: true },
  { Icon: FaceIcon, n: "05", t: "Find your photos", b: "A tap on a face, or one selfie, surfaces the shots you are in." },
];

const HERO = ["g1", "g4", "s2", "m5", "g8", "s6"];

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <section className="grid min-h-[100dvh] items-center gap-14 pb-24 pt-28 md:pt-36 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Reveal>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
              <span className="h-1.5 w-1.5 animate-[rec_1.4s_steps(2,end)_infinite] rounded-full bg-coral" />
              <Eyebrow>Live at your event</Eyebrow>
            </div>
          </Reveal>
          <Reveal index={1}>
            <h1 className="text-balance font-display text-[clamp(2.5rem,8.5vw,4.6rem)] font-bold leading-[0.95] tracking-[-0.03em]">
              Everyone&apos;s the <span className="text-lime">camera crew.</span>
            </h1>
          </Reveal>
          <Reveal index={2}>
            <p className="mt-7 max-w-md text-xl leading-relaxed text-white/55">
              Every guest captures the night from their own point of view. It all pools into one shared
              gallery, so you relive the whole event from every seat in the room, not just your own.
            </p>
          </Reveal>
          <Reveal index={3}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/create" className="cta group inline-flex items-center gap-3 rounded-full bg-lime py-2 pl-6 pr-2 font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
                Start an event
                <span className="ico grid h-9 w-9 place-items-center rounded-full bg-ink/10"><ArrowUR dark /></span>
              </Link>
              <a href="#how" className="cta rounded-full border border-white/10 bg-white/[0.04] px-6 py-3.5 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink">See how it works</a>
            </div>
          </Reveal>
          <Reveal index={4}>
            <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-4">
              <div><span className="block font-display text-3xl font-semibold text-white">One</span><span className="text-sm text-white/50">shared roll</span></div>
              <div className="hidden h-9 w-px bg-white/10 sm:block" />
              <div><span className="block font-display text-3xl font-semibold text-white">Every</span><span className="text-sm text-white/50">POV in the room</span></div>
              <div className="hidden h-9 w-px bg-white/10 sm:block" />
              <div><span className="block font-display text-3xl font-semibold text-white">Zero</span><span className="text-sm text-white/50">photos missed</span></div>
            </div>
          </Reveal>
        </div>
        <Reveal index={2}>
          <Bezel viewfinder coreClassName="overflow-hidden p-3">
            <div className="[column-count:2] [column-gap:12px]">
              {HERO.map((s) => (
                <div key={s} className="mb-3 overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/showcase/${s}.svg`} alt="" className="w-full" />
                </div>
              ))}
            </div>
          </Bezel>
        </Reveal>
      </section>

      {/* PROBLEM */}
      <section className="py-24">
        <Reveal className="max-w-3xl">
          <h2 className="text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
            You came home with 40 photos.<br />The night actually had <span className="text-lime">four thousand.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/55">
            Every guest shot the same event from a different seat, and all of it scattered across
            camera rolls no one ever shares. The full story existed. It just never landed in one place.
          </p>
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24">
        <Reveal><h2 className="mb-12 font-display text-4xl font-bold tracking-tight">From a QR to the whole night</h2></Reveal>
        <div className="grid gap-4 md:grid-cols-5">
          {STEPS.map(({ Icon, n, t, b, hot }, i) => (
            <Reveal key={n} index={i}>
              <Bezel className="h-full" style={hot ? { borderColor: "rgba(215,255,62,0.3)" } : undefined}>
                <div className="h-full p-6">
                  <Icon />
                  <div className={`mt-5 font-display text-sm ${hot ? "text-lime" : "text-white/30"}`}>{n}</div>
                  <h3 className="mt-1 font-semibold">{t}</h3>
                  <p className="mt-1.5 text-sm text-white/55">{b}</p>
                </div>
              </Bezel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FEATURE BENTO */}
      <section id="features" className="py-24">
        <Reveal><h2 className="mb-12 font-display text-4xl font-bold tracking-tight">One gallery, every point of view</h2></Reveal>
        <div className="grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2 lg:row-span-2">
            <Bezel viewfinder className="h-full">
              <div className="flex h-full flex-col p-8">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/10"><LayersIcon /></span>
                  <h3 className="font-display text-2xl font-semibold">The night, from every POV</h3>
                </div>
                <p className="mt-3 max-w-md text-white/50">
                  Every guest&apos;s camera roll, pooled into one living gallery. You finally see the moments you
                  missed, because you were busy being in them.
                </p>
                <div className="mt-6 grid min-h-[220px] grow grid-cols-3 grid-rows-2 gap-2 rounded-2xl bg-surface2 p-2">
                  {["g3", "s4", "m7", "g1", "s2", "m5"].map((s) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={s} src={`/showcase/${s}.svg`} alt="" className="h-full w-full rounded-lg object-cover" />
                  ))}
                </div>
              </div>
            </Bezel>
          </Reveal>
          {[
            { Icon: FaceIcon, t: "Find my photos", b: "One selfie, or a tap on a face, surfaces every frame you appear in. A handy feature, not the whole point." },
            { Icon: SearchIcon, t: "Search in plain words", b: "People near the cake. Golden hour. OCR and CLIP search, no tags needed." },
            { Icon: PinIcon, t: "Venue geofencing", b: "Only accept photos shot at the venue. Keep the gallery on-site and on-theme." },
            { Icon: GaugeIcon, t: "Per-guest caps", b: "Five, fifteen, or unlimited. A cap forces curation, so every shot earns its place." },
            { Icon: SparkIcon, t: "Auto-highlights", b: "The sharpest, best-lit frames pulled into a recap reel automatically." },
          ].map(({ Icon, t, b }, i) => (
            <Reveal key={t} index={i}>
              <Bezel className="h-full">
                <div className="h-full p-7">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/10"><Icon /></span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{t}</h3>
                  <p className="mt-1.5 text-sm text-white/55">{b}</p>
                </div>
              </Bezel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CONSENT */}
      <section className="py-24">
        <Reveal>
          <Bezel>
            <div
              className="grid items-center gap-8 p-10 md:grid-cols-[auto_1fr]"
              style={{ background: "linear-gradient(120deg,rgba(215,255,62,0.05),#0e0e10)" }}
            >
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-lime/10"><ShieldIcon /></span>
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight">Face matching that asks first</h2>
                <p className="mt-3 max-w-2xl text-white/50">
                  Faces are biometric data. Consent is part of the join flow, not buried in a policy, so every
                  guest opts in before a single face is processed. GDPR and BIPA grade, from day one.
                </p>
              </div>
            </div>
          </Bezel>
        </Reveal>
      </section>

      {/* HOSTS vs GUESTS */}
      <section className="grid gap-5 py-24 lg:grid-cols-2">
        {[
          { tag: "For hosts", t: "Run the night, not the upload queue", items: ["Create from web or phone, full control over every setting", "Live stats: crew joined, photos pooled, faces found", "Moderation queue, expiry, and one-tap export of the album"] },
          { tag: "For guests", t: "Scan, shoot, find yourself", items: ["Join in one scan, no app store, no password", "See the whole night from every other guest's angle", "One selfie, then download every photo you are in"] },
        ].map(({ tag, t, items }, i) => (
          <Reveal key={tag} index={i}>
            <Bezel className="h-full">
              <div className="h-full p-8">
                <p className="text-sm font-medium text-lime">{tag}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold">{t}</h3>
                <ul className="mt-5 space-y-3 text-white/55">
                  {items.map((it) => (<li key={it} className="flex gap-3"><Check />{it}</li>))}
                </ul>
              </div>
            </Bezel>
          </Reveal>
        ))}
      </section>

      {/* ENGINE */}
      <section id="engine" className="py-24">
        <Reveal>
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="max-w-xl font-display text-4xl font-bold leading-[1.05] tracking-tight">
                Self-hosted engine. Your photos stay yours.
              </h2>
              <p className="mt-5 max-w-xl leading-relaxed text-white/55">
                The AI runs on a self-hosted Immich engine behind our own backend, pointed at storage you
                control. Face detection, semantic search, and OCR happen on infrastructure you can hold, not a
                black box you rent.
              </p>
            </div>
            <div className="flex gap-3 font-mono text-xs text-white/40">
              {["Immich engine", "NestJS API", "your storage"].map((x) => (
                <span key={x} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{x}</span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section id="start" className="py-28">
        <Reveal>
          <Bezel viewfinder>
            <div className="relative overflow-hidden p-14 text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                <span className="h-1.5 w-1.5 animate-[rec_1.4s_steps(2,end)_infinite] rounded-full bg-coral" />
                <Eyebrow>Roll the cameras</Eyebrow>
              </div>
              <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] md:text-6xl">
                Be our<br />camera crew.
              </h2>
              <p className="mx-auto mt-6 max-w-md text-lg text-white/55">
                Set up your first event in under a minute. Your guests do the rest.
              </p>
              <Link href="/create" className="cta group mt-9 inline-flex items-center gap-3 rounded-full bg-lime py-2.5 pl-7 pr-2 font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
                Start an event
                <span className="ico grid h-9 w-9 place-items-center rounded-full bg-ink/10"><ArrowUR dark /></span>
              </Link>
            </div>
          </Bezel>
        </Reveal>
      </section>
    </>
  );
}
