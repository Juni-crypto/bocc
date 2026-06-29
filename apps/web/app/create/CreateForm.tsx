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

const EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: "WEDDING", label: "Wedding" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "SPORTS", label: "Sports" },
  { value: "CONCERT", label: "Concert" },
  { value: "TRAVEL", label: "Travel" },
];

// Per-guest cap presets; 0 = unlimited (shown as the infinity glyph).
const CAP_PRESETS: Array<{ value: number; label: string }> = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 30, label: "30" },
  { value: 0, label: "Unlimited" },
];

const GEOFENCE_STEPS = [50, 100, 250, 500, 1000];
const GEOFENCE_TICKS = ["50", "100", "250", "500", "1000"];

// Everything the wizard used to send, kept here so the payload never regresses.
// The essentials (name/type/venue/startsAt/visibility/perGuestCap/faceMatching)
// live in their own state; this holds the advanced fields at their sane defaults.
interface AdvancedState {
  totalCap: number; // 0 = no overall cap
  allowVideo: boolean;
  maxVideoSec: number;
  liveCaptureOnly: boolean;
  collapseDupes: boolean;
  uploadWindow: UploadWindow;
  geoEnabled: boolean;
  geofenceEnabled: boolean;
  geofenceRadiusM: number;
  mapView: boolean;
  autoGroup: boolean;
  autoHighlights: boolean;
  semanticSearch: boolean;
  autoModeration: boolean;
  requireName: boolean;
  hostApproval: boolean;
  uploadToUnlock: boolean;
  downloadPolicy: DownloadPolicy;
}

// Defaults match exactly what the old 6-step wizard sent, so nothing regresses.
const ADVANCED_DEFAULTS: AdvancedState = {
  totalCap: 0,
  allowVideo: true,
  maxVideoSec: 30,
  liveCaptureOnly: false,
  collapseDupes: true,
  uploadWindow: "DAYS_AFTER",
  geoEnabled: true,
  geofenceEnabled: true,
  geofenceRadiusM: 250,
  mapView: true,
  autoGroup: false,
  autoHighlights: true,
  semanticSearch: true,
  autoModeration: true,
  requireName: true,
  hostApproval: false,
  uploadToUnlock: true,
  downloadPolicy: "EVERYONE",
};

const inputCls =
  "w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

const labelCls = "mb-1.5 block text-sm text-white/55";

export function CreateForm() {
  const router = useRouter();
  const { token } = useAuth();

  // Essentials, shown by default.
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>("WEDDING");
  const [startsAt, setStartsAt] = useState(""); // datetime-local string, optional
  const [venue, setVenue] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PRIVATE");
  const [perGuestCap, setPerGuestCap] = useState(15);
  const [faceMatching, setFaceMatching] = useState(true);

  // Advanced, collapsed by default.
  const [adv, setAdv] = useState<AdvancedState>(ADVANCED_DEFAULTS);
  const [advOpen, setAdvOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setA = <K extends keyof AdvancedState>(key: K, value: AdvancedState[K]) =>
    setAdv((prev) => ({ ...prev, [key]: value }));

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !submitting;

  const previewTags = useMemo(() => {
    const tags: string[] = [
      perGuestCap === 0 ? "unlimited" : `${perGuestCap} / guest`,
    ];
    if (faceMatching) tags.push("face match");
    if (adv.geofenceEnabled) tags.push("geofenced");
    tags.push(visibility.toLowerCase());
    return tags;
  }, [perGuestCap, faceMatching, adv.geofenceEnabled, visibility]);

  const dto = (): CreateEventDto => {
    const payload: CreateEventDto = {
      name: trimmedName,
      type,
      perGuestCap,
      allowVideo: adv.allowVideo,
      maxVideoSec: adv.maxVideoSec,
      liveCaptureOnly: adv.liveCaptureOnly,
      uploadWindow: adv.uploadWindow,
      geoEnabled: adv.geoEnabled,
      geofenceEnabled: adv.geofenceEnabled,
      geofenceRadiusM: adv.geofenceRadiusM,
      mapView: adv.mapView,
      faceMatching,
      autoHighlights: adv.autoHighlights,
      semanticSearch: adv.semanticSearch,
      autoModeration: adv.autoModeration,
      visibility,
      requireName: adv.requireName,
      hostApproval: adv.hostApproval,
      uploadToUnlock: adv.uploadToUnlock,
      downloadPolicy: adv.downloadPolicy,
    };
    // Optional fields: only send when the host actually set them.
    if (venue.trim()) payload.venue = venue.trim();
    if (startsAt) payload.startsAt = new Date(startsAt).toISOString();
    if (adv.totalCap > 0) payload.totalCap = adv.totalCap;
    return payload;
  };

  const onCreate = async () => {
    if (!trimmedName) {
      setError("Give your event a name to go live.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const event = await api.createEvent(dto(), token ?? undefined);
      await api.goLive(event.id, token ?? undefined);
      router.push(`/host/${event.slug}`);
    } catch (e) {
      let msg: string;
      if (e instanceof ApiError) {
        msg =
          e.status === 401
            ? "Your session expired. Please sign in again, then create your event."
            : e.message;
      } else {
        msg = `Could not reach the API at ${API_BASE}. Make sure the backend is running, then try again.`;
      }
      setError(msg);
      setSubmitting(false);
    }
  };

  const startsLabel = startsAt
    ? new Date(startsAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Anytime";

  return (
    <section className="pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          New event
        </p>
      </Reveal>
      <Reveal index={1}>
        <h2 className="mb-3 font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
          Name it and go live
        </h2>
      </Reveal>
      <Reveal index={2}>
        <p className="mb-10 max-w-md text-sm text-white/55">
          A name is all you need. Tune the rest later, or open advanced settings
          if you like control.
        </p>
      </Reveal>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* main form */}
        <div className="space-y-5">
          {/* Essentials */}
          <Reveal>
            <Bezel
              style={{ borderColor: "rgba(215,255,62,0.3)" }}
              coreClassName="p-6"
            >
              <label htmlFor="event-name" className={labelCls}>
                Event name <span className="text-lime">*</span>
              </label>
              <input
                id="event-name"
                className={`${inputCls} mb-5`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aisha & Dev, Sangeet"
                maxLength={120}
                required
                autoFocus
              />

              <fieldset className="mb-5">
                <legend className={labelCls}>Event type</legend>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((t) => {
                    const active = type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setType(t.value)}
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
                  <label htmlFor="event-starts" className={labelCls}>
                    Starts <span className="text-white/35">(optional)</span>
                  </label>
                  <input
                    id="event-starts"
                    type="datetime-local"
                    className={`${inputCls} text-white/80 [color-scheme:dark]`}
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="event-venue" className={labelCls}>
                    Venue <span className="text-white/35">(optional)</span>
                  </label>
                  <input
                    id="event-venue"
                    className={`${inputCls} text-white/80`}
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. The Leela, Jaipur"
                  />
                </div>
              </div>
            </Bezel>
          </Reveal>

          {/* Three high-value choices */}
          <Reveal index={1}>
            <Bezel coreClassName="p-6">
              <fieldset className="mb-5">
                <legend className={labelCls}>Who can see this event</legend>
                <Segmented<Visibility>
                  label="Visibility"
                  value={visibility}
                  onChange={setVisibility}
                  options={[
                    { value: "PRIVATE", label: "Private (QR)" },
                    { value: "UNLISTED", label: "Unlisted" },
                    { value: "PUBLIC", label: "Public" },
                  ]}
                />
              </fieldset>

              <fieldset className="mb-5">
                <legend className={labelCls}>Photos per guest</legend>
                <div className="flex flex-wrap gap-2">
                  {CAP_PRESETS.map((p) => {
                    const active = perGuestCap === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setPerGuestCap(p.value)}
                        className={`min-h-[44px] rounded-full px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
                          active
                            ? "bg-lime font-semibold text-ink focus-visible:ring-white/80"
                            : "border border-white/10 bg-white/[0.04] text-white/70 hover:text-white focus-visible:ring-lime"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="-mb-3 border-t border-white/5 pt-1">
                <ToggleRow
                  title="Face matching"
                  hint="Guests find their photos with a selfie. Needs consent."
                  checked={faceMatching}
                  onChange={setFaceMatching}
                />
              </div>
            </Bezel>
          </Reveal>

          {/* Advanced settings disclosure */}
          <Reveal index={2}>
            <Bezel coreClassName="p-0">
              <button
                type="button"
                onClick={() => setAdvOpen((o) => !o)}
                aria-expanded={advOpen}
                aria-controls="advanced-panel"
                className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[inherit] px-6 py-4 text-left transition hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                <span>
                  <span className="font-display text-base font-semibold">
                    Advanced settings
                  </span>
                  <span className="ml-2 text-sm text-white/45">(optional)</span>
                  <span className="mt-0.5 block text-xs text-white/45">
                    Sensible defaults are already set. Open only if you want to
                    fine-tune.
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`shrink-0 text-lg text-white/60 transition-transform ${
                    advOpen ? "rotate-180" : ""
                  }`}
                >
                  ⌄
                </span>
              </button>

              {advOpen && (
                <div
                  id="advanced-panel"
                  className="space-y-6 border-t border-white/5 px-6 pb-6 pt-5"
                >
                  {/* Capture */}
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-white/80">
                      Capture
                    </h4>
                    <div className="divide-y divide-white/5">
                      <ToggleRow
                        title="Allow video clips"
                        hint={`Up to ${adv.maxVideoSec}s each`}
                        checked={adv.allowVideo}
                        onChange={(v) => setA("allowVideo", v)}
                      />
                      <ToggleRow
                        title="Live capture only"
                        hint="No camera-roll uploads"
                        checked={adv.liveCaptureOnly}
                        onChange={(v) => setA("liveCaptureOnly", v)}
                      />
                      <ToggleRow
                        title="Auto-collapse duplicates"
                        hint="Burst shots grouped"
                        checked={adv.collapseDupes}
                        onChange={(v) => setA("collapseDupes", v)}
                      />
                    </div>
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="total-cap" className="text-sm">
                          Total photo cap
                        </label>
                        <span className="font-display font-semibold text-lime">
                          {adv.totalCap === 0 ? "∞" : adv.totalCap}
                        </span>
                      </div>
                      <input
                        id="total-cap"
                        type="number"
                        min={0}
                        step={50}
                        className={inputCls}
                        value={adv.totalCap}
                        onChange={(e) =>
                          setA(
                            "totalCap",
                            Math.max(0, Number(e.target.value) || 0),
                          )
                        }
                        placeholder="0 = no overall limit"
                      />
                      <p className="mt-1.5 text-xs text-white/45">
                        0 means no overall limit across the event.
                      </p>
                    </div>
                    <p className="mb-2 mt-4 text-sm text-white/55">
                      Upload window
                    </p>
                    <Segmented<UploadWindow>
                      label="Upload window"
                      value={adv.uploadWindow}
                      onChange={(v) => setA("uploadWindow", v)}
                      options={[
                        { value: "DURING_EVENT", label: "During event" },
                        { value: "DAYS_AFTER", label: "Until 7 days after" },
                        { value: "ALWAYS", label: "Always open" },
                      ]}
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-white/80">
                      Location &amp; geo-tagging
                    </h4>
                    <div className="divide-y divide-white/5">
                      <ToggleRow
                        title="Geo-tagging"
                        hint="Read GPS from each photo"
                        checked={adv.geoEnabled}
                        onChange={(v) => setA("geoEnabled", v)}
                      />
                      <ToggleRow
                        title="Geofence"
                        hint="Only accept photos near the venue"
                        checked={adv.geofenceEnabled}
                        onChange={(v) => setA("geofenceEnabled", v)}
                      />
                      <ToggleRow
                        title="Map view"
                        hint="Pin photos on a map"
                        checked={adv.mapView}
                        onChange={(v) => setA("mapView", v)}
                      />
                      <ToggleRow
                        title="Auto-group by place"
                        hint="Ceremony, afterparty, etc."
                        checked={adv.autoGroup}
                        onChange={(v) => setA("autoGroup", v)}
                      />
                    </div>
                    {adv.geofenceEnabled && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-sm">Geofence radius</label>
                          <span className="font-display font-semibold text-lime">
                            {adv.geofenceRadiusM} m
                          </span>
                        </div>
                        <Slider
                          steps={GEOFENCE_STEPS}
                          ticks={GEOFENCE_TICKS}
                          value={adv.geofenceRadiusM}
                          onChange={(v) => setA("geofenceRadiusM", v)}
                          label="Geofence radius"
                        />
                      </div>
                    )}
                  </div>

                  {/* AI */}
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-white/80">
                      AI features
                    </h4>
                    <div className="divide-y divide-white/5">
                      <ToggleRow
                        title="Auto-highlights"
                        hint="Best-shot recap reel"
                        checked={adv.autoHighlights}
                        onChange={(v) => setA("autoHighlights", v)}
                      />
                      <ToggleRow
                        title="Semantic + OCR search"
                        hint="Search photos in plain words"
                        checked={adv.semanticSearch}
                        onChange={(v) => setA("semanticSearch", v)}
                      />
                      <ToggleRow
                        title="Auto-moderation"
                        hint="Filter NSFW / blurry shots"
                        checked={adv.autoModeration}
                        onChange={(v) => setA("autoModeration", v)}
                      />
                    </div>
                  </div>

                  {/* Access */}
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-white/80">
                      Access &amp; privacy
                    </h4>
                    <div className="divide-y divide-white/5">
                      <ToggleRow
                        title="Require name to join"
                        checked={adv.requireName}
                        onChange={(v) => setA("requireName", v)}
                      />
                      <ToggleRow
                        title="Host approves new guests"
                        checked={adv.hostApproval}
                        onChange={(v) => setA("hostApproval", v)}
                      />
                      <ToggleRow
                        title="Upload to unlock gallery"
                        hint="Must add photos before viewing"
                        checked={adv.uploadToUnlock}
                        onChange={(v) => setA("uploadToUnlock", v)}
                      />
                    </div>
                    <p className="mb-2 mt-4 text-sm text-white/55">Downloads</p>
                    <Segmented<DownloadPolicy>
                      label="Downloads"
                      value={adv.downloadPolicy}
                      onChange={(v) => setA("downloadPolicy", v)}
                      options={[
                        { value: "EVERYONE", label: "Everyone" },
                        { value: "HOST_ONLY", label: "Host only" },
                        { value: "DISABLED", label: "Disabled" },
                      ]}
                    />
                  </div>
                </div>
              )}
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
            <h3 className="mt-1 font-display text-xl font-bold">
              {trimmedName || "Your event"}
            </h3>
            <p className="text-sm text-white/55">
              {EVENT_TYPES.find((t) => t.value === type)?.label ?? "Event"} ·{" "}
              {startsLabel}
              {venue.trim() ? ` · ${venue.trim().split(",")[0]}` : ""}
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
              disabled={!canSubmit}
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
