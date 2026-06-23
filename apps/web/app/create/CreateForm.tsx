"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bezel } from "@/components/Bezel";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import { Segmented } from "@/components/Segmented";
import { Slider } from "@/components/Slider";
import { ToggleRow } from "@/components/Toggle";
import { api, ApiError, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  CreateEventDto,
  DownloadPolicy,
  EventType,
  UploadWindow,
  Visibility,
} from "@/lib/types";

const STEPS = [
  "Basics",
  "Capture rules",
  "Location",
  "AI features",
  "Access",
  "Review",
] as const;

const EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: "WEDDING", label: "Wedding" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "SPORTS", label: "Sports" },
  { value: "CONCERT", label: "Concert" },
  { value: "TRAVEL", label: "Travel" },
];

// Per-guest cap slider stops; 0 = unlimited (shown as the infinity glyph).
const CAP_STEPS = [5, 10, 15, 20, 30, 0];
const CAP_TICKS = ["5", "10", "15", "20", "30", "∞"];

interface FormState extends Required<
  Pick<
    CreateEventDto,
    | "name"
    | "type"
    | "venue"
    | "perGuestCap"
    | "allowVideo"
    | "liveCaptureOnly"
    | "uploadWindow"
    | "geoEnabled"
    | "geofenceEnabled"
    | "geofenceRadiusM"
    | "mapView"
    | "faceMatching"
    | "autoHighlights"
    | "semanticSearch"
    | "autoModeration"
    | "visibility"
    | "requireName"
    | "hostApproval"
    | "uploadToUnlock"
    | "downloadPolicy"
  >
> {
  startsAtLabel: string;
  autoGroup: boolean;
  collapseDupes: boolean;
}

const INITIAL: FormState = {
  name: "Aisha & Dev, Sangeet",
  type: "WEDDING",
  venue: "The Leela, Jaipur",
  startsAtLabel: "Jun 28, 6:00 PM",
  perGuestCap: 15,
  allowVideo: true,
  liveCaptureOnly: false,
  collapseDupes: true,
  uploadWindow: "DAYS_AFTER",
  geoEnabled: true,
  geofenceEnabled: true,
  geofenceRadiusM: 250,
  mapView: true,
  autoGroup: false,
  faceMatching: true,
  autoHighlights: true,
  semanticSearch: true,
  autoModeration: true,
  visibility: "PRIVATE",
  requireName: true,
  hostApproval: false,
  uploadToUnlock: true,
  downloadPolicy: "EVERYONE",
};

const inputCls =
  "w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

export function CreateForm() {
  const router = useRouter();
  const { token } = useAuth();
  const [f, setF] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const capLabel = f.perGuestCap === 0 ? "∞" : String(f.perGuestCap);

  const previewTags = useMemo(() => {
    const tags: string[] = [
      f.perGuestCap === 0 ? "unlimited" : `${f.perGuestCap} / guest`,
    ];
    if (f.geofenceEnabled) tags.push("geofenced");
    if (f.faceMatching) tags.push("face match");
    tags.push(f.visibility.toLowerCase());
    return tags;
  }, [f.perGuestCap, f.geofenceEnabled, f.faceMatching, f.visibility]);

  const dto = (): CreateEventDto => ({
    name: f.name,
    type: f.type,
    venue: f.venue,
    perGuestCap: f.perGuestCap,
    allowVideo: f.allowVideo,
    liveCaptureOnly: f.liveCaptureOnly,
    uploadWindow: f.uploadWindow,
    geoEnabled: f.geoEnabled,
    geofenceEnabled: f.geofenceEnabled,
    geofenceRadiusM: f.geofenceRadiusM,
    mapView: f.mapView,
    faceMatching: f.faceMatching,
    autoHighlights: f.autoHighlights,
    semanticSearch: f.semanticSearch,
    autoModeration: f.autoModeration,
    visibility: f.visibility,
    requireName: f.requireName,
    hostApproval: f.hostApproval,
    uploadToUnlock: f.uploadToUnlock,
    downloadPolicy: f.downloadPolicy,
  });

  const onCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const event = await api.createEvent(dto(), token ?? undefined);
      await api.goLive(event.id, token ?? undefined);
      router.push(`/host/${event.slug}`);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : `Could not reach the API at ${API_BASE}. Make sure the backend is running, then try again.`;
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <section className="pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          New event
        </p>
      </Reveal>
      <Reveal index={1}>
        <h2 className="mb-10 font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
          Set up your shoot
        </h2>
      </Reveal>

      <div className="grid items-start gap-6 lg:grid-cols-[230px_1fr_300px]">
        {/* stepper rail */}
        <Reveal className="lg:sticky lg:top-28">
          <Bezel coreClassName="p-3">
            {STEPS.map((label, i) => {
              const state =
                i + 1 < currentStep
                  ? "done"
                  : i + 1 === currentStep
                    ? "on"
                    : "";
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCurrentStep(i + 1)}
                  aria-current={i + 1 === currentStep ? "step" : undefined}
                  className={`step ${state} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink`}
                >
                  <span className="dot" aria-hidden="true">
                    {i + 1 < currentStep ? "✓" : i + 1}
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </Bezel>
        </Reveal>

        {/* option cards */}
        <div className="space-y-5">
          {/* Basics */}
          <Reveal>
            <Bezel coreClassName="p-6">
              <h3 className="mb-4 font-display text-lg font-semibold">Basics</h3>
              <label
                htmlFor="event-name"
                className="mb-1.5 block text-sm text-white/55"
              >
                Event name
              </label>
              <input
                id="event-name"
                className={`${inputCls} mb-4`}
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
              />
              <fieldset className="mb-4">
                <legend className="mb-2 block text-sm text-white/55">
                  Event type
                </legend>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((t) => {
                    const active = f.type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => set("type", t.value)}
                        className={`min-h-[44px] rounded-full px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
                          active
                            ? "bg-lime font-semibold text-ink focus-visible:ring-white/80"
                            : "border border-white/10 bg-white/[0.04] text-white/70 hover:text-white focus-visible:ring-lime"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="event-starts"
                    className="mb-1.5 block text-sm text-white/55"
                  >
                    Starts
                  </label>
                  <input
                    id="event-starts"
                    className={`${inputCls} text-white/80`}
                    value={f.startsAtLabel}
                    onChange={(e) => set("startsAtLabel", e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="event-venue"
                    className="mb-1.5 block text-sm text-white/55"
                  >
                    Venue
                  </label>
                  <input
                    id="event-venue"
                    className={`${inputCls} text-white/80`}
                    value={f.venue}
                    onChange={(e) => set("venue", e.target.value)}
                  />
                </div>
              </div>
            </Bezel>
          </Reveal>

          {/* Capture rules */}
          <Reveal index={1}>
            <Bezel style={{ borderColor: "rgba(215,255,62,0.3)" }} coreClassName="p-6">
              <h3 className="mb-1 font-display text-lg font-semibold">
                Capture rules
              </h3>
              <p className="mb-5 text-sm text-white/55">
                Control how much each guest can add.
              </p>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm">Photos per guest</label>
                <span className="font-display font-semibold text-lime">
                  {capLabel}
                </span>
              </div>
              <Slider
                steps={CAP_STEPS}
                ticks={CAP_TICKS}
                value={f.perGuestCap}
                onChange={(v) => set("perGuestCap", v)}
                label="Photos per guest"
              />
              <div className="mt-5 divide-y divide-white/5">
                <ToggleRow
                  title="Allow video clips"
                  hint="Up to 30s each"
                  checked={f.allowVideo}
                  onChange={(v) => set("allowVideo", v)}
                />
                <ToggleRow
                  title="Live capture only"
                  hint="No camera-roll uploads"
                  checked={f.liveCaptureOnly}
                  onChange={(v) => set("liveCaptureOnly", v)}
                />
                <ToggleRow
                  title="Auto-collapse duplicates"
                  hint="Burst shots grouped"
                  checked={f.collapseDupes}
                  onChange={(v) => set("collapseDupes", v)}
                />
              </div>
              <p className="mb-2 mt-4 block text-sm text-white/55">
                Upload window
              </p>
              <Segmented<UploadWindow>
                label="Upload window"
                value={f.uploadWindow}
                onChange={(v) => set("uploadWindow", v)}
                options={[
                  { value: "DURING_EVENT", label: "During event" },
                  { value: "DAYS_AFTER", label: "Until 7 days after" },
                  { value: "ALWAYS", label: "Always open" },
                ]}
              />
            </Bezel>
          </Reveal>

          {/* Location */}
          <Reveal index={2}>
            <Bezel coreClassName="p-6">
              <h3 className="mb-1 font-display text-lg font-semibold">
                Location &amp; geo-tagging
              </h3>
              <p className="mb-5 text-sm text-white/55">
                Tie photos to where they were shot.
              </p>
              <div className="divide-y divide-white/5">
                <ToggleRow
                  title="Geo-tagging"
                  hint="Read GPS from each photo"
                  checked={f.geoEnabled}
                  onChange={(v) => set("geoEnabled", v)}
                />
                <ToggleRow
                  title="Geofence"
                  hint="Only accept photos near the venue"
                  checked={f.geofenceEnabled}
                  onChange={(v) => set("geofenceEnabled", v)}
                />
                <ToggleRow
                  title="Map view"
                  hint="Pin photos on a map"
                  checked={f.mapView}
                  onChange={(v) => set("mapView", v)}
                />
                <ToggleRow
                  title="Auto-group by place"
                  hint="Ceremony, afterparty, etc."
                  checked={f.autoGroup}
                  onChange={(v) => set("autoGroup", v)}
                />
              </div>
              <div className="mb-1.5 mt-4 flex items-center justify-between">
                <label className="text-sm">Geofence radius</label>
                <span className="font-display font-semibold text-lime">
                  {f.geofenceRadiusM} m
                </span>
              </div>
              <Slider
                min={50}
                max={1000}
                step={50}
                value={f.geofenceRadiusM}
                onChange={(v) => set("geofenceRadiusM", v)}
                label="Geofence radius"
              />
            </Bezel>
          </Reveal>

          {/* AI */}
          <Reveal index={3}>
            <Bezel coreClassName="p-6">
              <h3 className="mb-1 font-display text-lg font-semibold">
                AI features
              </h3>
              <p className="mb-5 text-sm text-white/55">
                Powered by the Immich engine.
              </p>
              <div className="divide-y divide-white/5">
                <ToggleRow
                  title="Face matching"
                  hint="Selfie finds a guest's photos. Needs consent."
                  checked={f.faceMatching}
                  onChange={(v) => set("faceMatching", v)}
                />
                <ToggleRow
                  title="Auto-highlights"
                  hint="Best-shot recap reel"
                  checked={f.autoHighlights}
                  onChange={(v) => set("autoHighlights", v)}
                />
                <ToggleRow
                  title="Semantic + OCR search"
                  hint="Search photos in plain words"
                  checked={f.semanticSearch}
                  onChange={(v) => set("semanticSearch", v)}
                />
                <ToggleRow
                  title="Auto-moderation"
                  hint="Filter NSFW / blurry shots"
                  checked={f.autoModeration}
                  onChange={(v) => set("autoModeration", v)}
                />
              </div>
            </Bezel>
          </Reveal>

          {/* Access */}
          <Reveal index={4}>
            <Bezel coreClassName="p-6">
              <h3 className="mb-1 font-display text-lg font-semibold">
                Access &amp; privacy
              </h3>
              <p className="mb-5 text-sm text-white/55">
                Who can join, view, and download.
              </p>
              <p className="mb-2 block text-sm text-white/55">Visibility</p>
              <div className="mb-4">
                <Segmented<Visibility>
                  label="Visibility"
                  value={f.visibility}
                  onChange={(v) => set("visibility", v)}
                  options={[
                    { value: "PRIVATE", label: "Private (QR)" },
                    { value: "UNLISTED", label: "Unlisted" },
                    { value: "PUBLIC", label: "Public" },
                  ]}
                />
              </div>
              <div className="divide-y divide-white/5">
                <ToggleRow
                  title="Require name to join"
                  checked={f.requireName}
                  onChange={(v) => set("requireName", v)}
                />
                <ToggleRow
                  title="Host approves new guests"
                  checked={f.hostApproval}
                  onChange={(v) => set("hostApproval", v)}
                />
                <ToggleRow
                  title="Upload to unlock gallery"
                  hint="Must add photos before viewing"
                  checked={f.uploadToUnlock}
                  onChange={(v) => set("uploadToUnlock", v)}
                />
              </div>
              <p className="mb-2 mt-4 block text-sm text-white/55">Downloads</p>
              <Segmented<DownloadPolicy>
                label="Downloads"
                value={f.downloadPolicy}
                onChange={(v) => set("downloadPolicy", v)}
                options={[
                  { value: "EVERYONE", label: "Everyone" },
                  { value: "HOST_ONLY", label: "Host only" },
                  { value: "DISABLED", label: "Disabled" },
                ]}
              />
            </Bezel>
          </Reveal>
        </div>

        {/* live preview / launch */}
        <Reveal className="lg:sticky lg:top-28" index={1}>
          <Bezel viewfinder coreClassName="p-5">
            <div
              aria-hidden="true"
              className="mb-4 grid aspect-[600/380] w-full place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] text-3xl text-white/30"
            >
              ◉
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">
              Preview
            </p>
            <h3 className="mt-1 font-display text-xl font-bold">{f.name}</h3>
            <p className="text-sm text-white/55">
              {EVENT_TYPES.find((t) => t.value === f.type)?.label ?? "Event"} ·{" "}
              {f.startsAtLabel.split(",")[0]} · {f.venue.split(",")[0]}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
              {previewTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-white/70"
                >
                  {tag}
                </span>
              ))}
            </div>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral"
              >
                {error}
              </p>
            )}
            <PillButton
              fullWidth
              className="mt-5 py-3.5"
              arrow={submitting ? null : "↗"}
              disabled={submitting}
              onClick={onCreate}
            >
              {submitting ? "Going live…" : "Create & go live"}
            </PillButton>
            <p className="mt-3 text-center text-xs text-white/55">
              You can change any of this later
            </p>
          </Bezel>
        </Reveal>
      </div>
    </section>
  );
}
