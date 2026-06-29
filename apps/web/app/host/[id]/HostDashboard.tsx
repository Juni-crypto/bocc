"use client";

import { useEffect, useState } from "react";
import { Bezel } from "@/components/Bezel";
import { PillButton } from "@/components/PillButton";
import { QrCode } from "@/components/QrCode";
import { RecDot } from "@/components/RecDot";
import { Reveal } from "@/components/Reveal";
import { Segmented } from "@/components/Segmented";
import { ToggleRow } from "@/components/Toggle";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import type {
  BoccEvent,
  CreateEventDto,
  EventStats,
  Photo,
  UploadWindow,
  Visibility,
} from "@/lib/types";

interface HostDashboardProps {
  event: BoccEvent;
  eventId: string | null;
  slug: string;
  title: string;
  joinUrl: string;
  shareLabel: string;
  live: boolean;
}

// Editable settings panel state, mirroring the create wizard's field set.
interface SettingsForm {
  name: string;
  visibility: Visibility;
  perGuestCap: number;
  totalCap: number;
  requireName: boolean;
  faceMatching: boolean;
  semanticSearch: boolean;
  moderationQueue: boolean;
  hostApproval: boolean;
  uploadWindow: UploadWindow;
  geofenceEnabled: boolean;
  geofenceRadiusM: number;
}

function formFromEvent(ev: BoccEvent): SettingsForm {
  return {
    name: ev.name ?? "",
    visibility: ev.visibility ?? "PRIVATE",
    perGuestCap: ev.perGuestCap ?? 0,
    totalCap: ev.totalCap ?? 0,
    requireName: ev.requireName ?? false,
    faceMatching: ev.faceMatching ?? false,
    semanticSearch: ev.semanticSearch ?? false,
    moderationQueue: ev.moderationQueue ?? false,
    hostApproval: ev.hostApproval ?? false,
    uploadWindow: ev.uploadWindow ?? "DURING_EVENT",
    geofenceEnabled: ev.geofenceEnabled ?? false,
    geofenceRadiusM: ev.geofenceRadiusM ?? 250,
  };
}

const settingsInputCls =
  "w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

const EMPTY_STATS: EventStats = {
  crew: 0,
  photos: 0,
  pending: 0,
  faces: 0,
  storageBytes: 0,
};

export function HostDashboard({
  event: initialEvent,
  eventId,
  slug,
  title,
  joinUrl,
  shareLabel,
  live,
}: HostDashboardProps) {
  const { token } = useAuth();
  const [stats, setStats] = useState<EventStats>(EMPTY_STATS);
  const [pending, setPending] = useState<Photo[]>([]);
  const [recent, setRecent] = useState<Photo[]>([]);
  const [copied, setCopied] = useState(false);

  // Local copy of the event so status / settings changes reflect instantly.
  const [event, setEvent] = useState<BoccEvent>(initialEvent);
  const ended = event.status === "ENDED";

  // End event.
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  // Edit settings panel.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form, setForm] = useState<SettingsForm>(() => formFromEvent(initialEvent));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const endEvent = async () => {
    if (!eventId || !token || ending) return;
    if (!window.confirm("End this event? Uploads close and the crew can no longer add photos. This cannot be undone.")) {
      return;
    }
    setEnding(true);
    setEndError(null);
    try {
      const next = await api.endEvent(eventId, token);
      setEvent(next);
    } catch (e) {
      setEndError(e instanceof ApiError ? e.message : "Could not end the event. Try again.");
    } finally {
      setEnding(false);
    }
  };

  const openSettings = () => {
    setForm(formFromEvent(event));
    setSaveError(null);
    setSaved(false);
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    if (!eventId || !token || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    const dto: Partial<CreateEventDto> = {
      name: form.name,
      visibility: form.visibility,
      perGuestCap: form.perGuestCap,
      totalCap: form.totalCap,
      requireName: form.requireName,
      faceMatching: form.faceMatching,
      semanticSearch: form.semanticSearch,
      moderationQueue: form.moderationQueue,
      hostApproval: form.hostApproval,
      uploadWindow: form.uploadWindow,
      geofenceEnabled: form.geofenceEnabled,
      geofenceRadiusM: form.geofenceRadiusM,
    };
    try {
      const next = await api.updateEvent(eventId, dto, token);
      setEvent(next);
      setSaved(true);
      setSettingsOpen(false);
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Could not save settings. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Live-poll stats + moderation queue when we have a real event id + token.
  useEffect(() => {
    if (!eventId || !token) return;
    let active = true;
    const tick = async () => {
      try {
        const [next, queue, gallery] = await Promise.all([
          api.stats(eventId, token),
          api.moderation(eventId, token).catch(() => null),
          api.gallery(slug, { take: 8 }).catch(() => null),
        ]);
        if (!active) return;
        setStats(next);
        if (queue) setPending(queue.photos);
        if (gallery) setRecent(gallery.photos);
      } catch {
        /* keep last known data */
      }
    };
    tick();
    const interval = setInterval(tick, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [eventId, slug, token]);

  const approveAll = async () => {
    if (!eventId || !token || !pending.length) return;
    const ids = pending.map((p) => p.id);
    setPending([]);
    await Promise.all(
      ids.map((pid) => api.moderate(eventId, pid, "approve", token).catch(() => null)),
    );
    try {
      const [next, queue] = await Promise.all([
        api.stats(eventId, token),
        api.moderation(eventId, token),
      ]);
      setStats(next);
      setPending(queue.photos);
    } catch {
      /* keep optimistic state */
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          Host view
        </p>
      </Reveal>
      <Reveal index={1}>
        <div className="mb-12 flex flex-wrap items-center gap-4">
          <h2 className="font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
            {ended ? "Your event has ended" : "Your event is live"}
          </h2>
          {ended && (
            <span className="inline-flex items-center gap-2 rounded-full border border-coral/40 bg-coral/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-coral">
              <RecDot tone="coral" size={6} /> Ended
            </span>
          )}
        </div>
      </Reveal>

      {/* host controls: edit settings + end event */}
      <Reveal>
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <PillButton
              variant="ghost"
              className="px-5 py-3 text-sm"
              aria-expanded={settingsOpen}
              onClick={() => (settingsOpen ? setSettingsOpen(false) : openSettings())}
            >
              {settingsOpen ? "Close settings" : "Edit settings"}
            </PillButton>

            {!ended && (
              <button
                type="button"
                onClick={endEvent}
                disabled={ending}
                className="inline-flex min-h-[44px] items-center rounded-full border border-coral/40 bg-coral/10 px-5 py-3 text-sm font-semibold text-coral transition hover:bg-coral/20 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                {ending ? "Ending…" : "End event"}
              </button>
            )}

            {saved && !settingsOpen && (
              <span
                role="status"
                className="inline-flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-4 py-1.5 text-xs font-semibold text-lime"
              >
                Settings saved
              </span>
            )}
          </div>

          {endError && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral"
            >
              {endError}
            </p>
          )}

          {settingsOpen && (
            <Bezel coreClassName="mt-4 p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">
                  Edit settings
                </h3>
                <span className="text-xs text-white/55">
                  Changes apply live for the crew
                </span>
              </div>

              <label
                htmlFor="settings-name"
                className="mb-1.5 block text-sm text-white/55"
              >
                Event name
              </label>
              <input
                id="settings-name"
                className={`${settingsInputCls} mb-5`}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />

              <p className="mb-2 block text-sm text-white/55">Visibility</p>
              <div className="mb-5">
                <Segmented<Visibility>
                  label="Visibility"
                  value={form.visibility}
                  onChange={(v) => setField("visibility", v)}
                  options={[
                    { value: "PRIVATE", label: "Private (QR)" },
                    { value: "UNLISTED", label: "Unlisted" },
                    { value: "PUBLIC", label: "Public" },
                  ]}
                />
              </div>

              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="settings-per-guest-cap"
                    className="mb-1.5 block text-sm text-white/55"
                  >
                    Photos per guest (0 = unlimited)
                  </label>
                  <input
                    id="settings-per-guest-cap"
                    type="number"
                    min={0}
                    className={settingsInputCls}
                    value={form.perGuestCap}
                    onChange={(e) =>
                      setField("perGuestCap", Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-total-cap"
                    className="mb-1.5 block text-sm text-white/55"
                  >
                    Total photo cap (0 = unlimited)
                  </label>
                  <input
                    id="settings-total-cap"
                    type="number"
                    min={0}
                    className={settingsInputCls}
                    value={form.totalCap}
                    onChange={(e) =>
                      setField("totalCap", Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>
              </div>

              <p className="mb-2 block text-sm text-white/55">Upload window</p>
              <div className="mb-5">
                <Segmented<UploadWindow>
                  label="Upload window"
                  value={form.uploadWindow}
                  onChange={(v) => setField("uploadWindow", v)}
                  options={[
                    { value: "DURING_EVENT", label: "During event" },
                    { value: "DAYS_AFTER", label: "Until 7 days after" },
                    { value: "ALWAYS", label: "Always open" },
                  ]}
                />
              </div>

              <div className="divide-y divide-white/5">
                <ToggleRow
                  title="Require name to join"
                  checked={form.requireName}
                  onChange={(v) => setField("requireName", v)}
                />
                <ToggleRow
                  title="Face matching"
                  hint="Selfie finds a guest's photos. Needs consent."
                  checked={form.faceMatching}
                  onChange={(v) => setField("faceMatching", v)}
                />
                <ToggleRow
                  title="Semantic + OCR search"
                  hint="Search photos in plain words"
                  checked={form.semanticSearch}
                  onChange={(v) => setField("semanticSearch", v)}
                />
                <ToggleRow
                  title="Moderation queue"
                  hint="Hold uploads for review"
                  checked={form.moderationQueue}
                  onChange={(v) => setField("moderationQueue", v)}
                />
                <ToggleRow
                  title="Host approves new uploads"
                  hint="Photos wait for your approval"
                  checked={form.hostApproval}
                  onChange={(v) => setField("hostApproval", v)}
                />
                <ToggleRow
                  title="Geofence"
                  hint="Only accept photos near the venue"
                  checked={form.geofenceEnabled}
                  onChange={(v) => setField("geofenceEnabled", v)}
                />
              </div>

              {form.geofenceEnabled && (
                <div className="mt-4">
                  <label
                    htmlFor="settings-geofence-radius"
                    className="mb-1.5 block text-sm text-white/55"
                  >
                    Geofence radius (m)
                  </label>
                  <input
                    id="settings-geofence-radius"
                    type="number"
                    min={50}
                    step={50}
                    className={settingsInputCls}
                    value={form.geofenceRadiusM}
                    onChange={(e) =>
                      setField("geofenceRadiusM", Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>
              )}

              {saveError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral"
                >
                  {saveError}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <PillButton
                  className="px-5 py-3 text-sm"
                  disabled={saving}
                  onClick={saveSettings}
                >
                  {saving ? "Saving…" : "Save settings"}
                </PillButton>
                <PillButton
                  variant="ghost"
                  className="px-5 py-3 text-sm"
                  disabled={saving}
                  onClick={() => setSettingsOpen(false)}
                >
                  Cancel
                </PillButton>
              </div>
            </Bezel>
          )}
        </div>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* QR / share card */}
        <Reveal>
          <Bezel viewfinder coreClassName="flex flex-col items-center p-8 text-center">
            <div
              className={`mb-5 flex items-center gap-2 text-xs ${
                ended || live ? "text-coral" : "text-white/55"
              }`}
            >
              <RecDot tone="coral" size={6} />{" "}
              {ended ? "ENDED · UPLOADS CLOSED" : live ? "RECORDING · LIVE" : "DRAFT"}
            </div>
            <h3 className="font-display text-2xl font-semibold">
              {event.name || title}
            </h3>
            <p className="mb-7 text-sm text-white/55">
              {ended
                ? "This event is closed. The crew can no longer add photos."
                : "Tap, scan, or share the link"}
            </p>
            <div className="rounded-2xl shadow-[0_0_50px_rgba(215,255,62,0.15)]">
              <QrCode
                value={typeof window !== "undefined" ? `${window.location.origin}/e/${slug}` : joinUrl}
                size={180}
              />
            </div>
            <div className="mt-6 max-w-full break-all rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-center font-mono text-sm text-white/70">
              {shareLabel}
            </div>
            <div className="mt-4 flex w-full gap-2">
              <PillButton
                fullWidth
                className="flex-1 py-3"
                arrow={copied ? false : "↗"}
                onClick={copyLink}
              >
                {copied ? "Copied!" : "Copy link"}
              </PillButton>
              <PillButton variant="ghost" className="flex-1 py-3 text-sm">
                Download QR
              </PillButton>
            </div>
          </Bezel>
        </Reveal>

        {/* live stats + feed */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
            <Reveal>
              <Bezel coreClassName="p-4 sm:p-6">
                <div className="font-display text-3xl font-bold text-lime sm:text-4xl">
                  {stats.crew}
                </div>
                <div className="mt-2 text-sm text-white/55">crew joined</div>
              </Bezel>
            </Reveal>
            <Reveal index={1}>
              <Bezel coreClassName="p-4 sm:p-6">
                <div className="font-display text-3xl font-bold sm:text-4xl">
                  {stats.photos}
                </div>
                <div className="mt-2 text-sm text-white/55">photos pooled</div>
              </Bezel>
            </Reveal>
            <Reveal index={2}>
              <Bezel coreClassName="p-4 sm:p-6">
                <div className="font-display text-3xl font-bold sm:text-4xl">
                  {stats.faces}
                </div>
                <div className="mt-2 text-sm text-white/55">faces found</div>
              </Bezel>
            </Reveal>
            <Reveal index={3}>
              <Bezel coreClassName="p-4 sm:p-6">
                <div className="font-display text-3xl font-bold sm:text-4xl">
                  {formatBytes(stats.storageBytes)}
                </div>
                <div className="mt-2 text-sm text-white/55">storage used</div>
              </Bezel>
            </Reveal>
          </div>

          <Reveal>
            <Bezel coreClassName="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent uploads</h3>
                <span className="flex items-center gap-1.5 text-xs text-white/55">
                  <RecDot tone="lime" size={6} /> auto-updating
                </span>
              </div>
              {recent.length ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {recent.map((p) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={p.id}
                      src={p.thumbUrl}
                      alt="Recent upload"
                      loading="lazy"
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/55">
                  No photos yet. Share the link or QR and the crew&apos;s shots
                  land here live.
                </p>
              )}
            </Bezel>
          </Reveal>

          {/* moderation */}
          <Reveal>
            <Bezel coreClassName="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Moderation queue</h3>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">
                  {pending.length} pending
                </span>
              </div>
              {pending.length > 0 ? (
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {pending.slice(0, 8).map((p) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={p.id}
                        src={p.thumbUrl}
                        alt="Pending photo"
                        loading="lazy"
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-white/55">
                      {pending.length} photo{pending.length === 1 ? "" : "s"}{" "}
                      awaiting your approval.
                    </p>
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={approveAll}
                        className="min-h-[44px] rounded-full bg-lime px-4 py-2 text-xs font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                      >
                        Approve all
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/55">
                  Nothing waiting. New uploads appear here when host approval is
                  on.
                </p>
              )}
            </Bezel>
          </Reveal>

          {/* highlights */}
          <Reveal>
            <Bezel
              style={{
                background:
                  "linear-gradient(135deg,rgba(215,255,62,0.12),rgba(255,255,255,0.04))",
              }}
              coreClassName="flex items-start gap-4 p-6"
              coreStyle={{
                background:
                  "linear-gradient(135deg,rgba(215,255,62,0.06),#0E0E10)",
              }}
            >
              <div
                aria-hidden="true"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime text-xl font-bold text-ink"
              >
                ✶
              </div>
              <div>
                <h3 className="text-lg font-semibold">Auto-highlights ready</h3>
                <p className="mt-1 text-sm text-white/60">
                  We picked the 24 sharpest, best-lit frames for a recap reel.
                </p>
              </div>
            </Bezel>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
