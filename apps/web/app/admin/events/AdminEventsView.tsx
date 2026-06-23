"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bezel } from "@/components/Bezel";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import type { AdminEvent, EventStatus, Visibility } from "@/lib/types";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

const selectCls =
  `min-h-[44px] rounded-lg border border-white/10 bg-surface2 px-2.5 py-1.5 text-xs text-white/80 outline-none transition focus:border-lime ${focusRing}`;

const STATUSES: EventStatus[] = ["DRAFT", "LIVE", "ENDED"];
const VISIBILITIES: Visibility[] = ["PRIVATE", "UNLISTED", "PUBLIC"];

export function AdminEventsView() {
  const { token } = useAuth();
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.admin
      .events(token)
      .then((list) => active && setEvents(list))
      .catch((e) => active && setError(e?.message ?? "Could not load events."));
    return () => {
      active = false;
    };
  }, [token]);

  const patch = async (id: string, dto: Partial<AdminEvent>) => {
    if (!token) return;
    setBusy(id);
    setError(null);
    try {
      await api.admin.updateEvent(id, dto, token);
      setEvents((prev) => (prev ? prev.map((e) => (e.id === id ? { ...e, ...dto } : e)) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!token) return;
    setBusy(id);
    setError(null);
    try {
      await api.admin.deleteEvent(id, token);
      setEvents((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
      setConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">All events</h1>
        <p className="text-sm text-white/55">Every event across the platform. Edit visibility or status, or delete.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </p>
      )}

      {events === null && !error && <p className="text-sm text-white/45" aria-busy="true">Loading events…</p>}

      {events !== null && events.length === 0 && (
        <p className="text-sm text-white/45">No events have been created yet.</p>
      )}

      {events && events.length > 0 && (
        <Bezel coreClassName="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-left text-sm">
            <caption className="sr-only">All events on the platform</caption>
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-white/45">
                <th scope="col" className="px-4 py-3 font-medium">Event</th>
                <th scope="col" className="px-4 py-3 font-medium">Host</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Visibility</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Photos</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Storage</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Crew</th>
                <th scope="col" className="px-4 py-3 font-medium">Created</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((ev) => {
                const rowBusy = busy === ev.id;
                return (
                  <tr key={ev.id} className="align-middle">
                    <td className="px-4 py-3">
                      <Link
                        href={`/e/${ev.slug}`}
                        className={`rounded font-medium text-white/90 underline-offset-4 hover:text-lime hover:underline ${focusRing}`}
                      >
                        {ev.name}
                      </Link>
                      <div className="font-mono text-[11px] text-white/35">{ev.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{ev.host?.email ?? "-"}</td>
                    <td className="px-4 py-3">
                      <label className="sr-only" htmlFor={`status-${ev.id}`}>
                        Status for {ev.name}
                      </label>
                      <select
                        id={`status-${ev.id}`}
                        className={selectCls}
                        value={ev.status}
                        disabled={rowBusy}
                        onChange={(e) => patch(ev.id, { status: e.target.value as EventStatus })}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <label className="sr-only" htmlFor={`vis-${ev.id}`}>
                        Visibility for {ev.name}
                      </label>
                      <select
                        id={`vis-${ev.id}`}
                        className={selectCls}
                        value={ev.visibility}
                        disabled={rowBusy}
                        onChange={(e) => patch(ev.id, { visibility: e.target.value as Visibility })}
                      >
                        {VISIBILITIES.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/70">{ev.photos}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/70">{formatBytes(ev.storageBytes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/70">{ev.crew}</td>
                    <td className="px-4 py-3 text-white/50">
                      {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {confirmId === ev.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() => remove(ev.id)}
                            className={`min-h-[36px] rounded-full bg-coral px-3 py-1.5 text-xs font-semibold text-ink ${focusRing}`}
                          >
                            {rowBusy ? "Deleting…" : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className={`min-h-[36px] rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 ${focusRing}`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() => setConfirmId(ev.id)}
                            className={`min-h-[36px] rounded-full border border-coral/30 bg-coral/10 px-3 py-1.5 text-xs font-medium text-coral transition hover:bg-coral/20 ${focusRing}`}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Bezel>
      )}
    </div>
  );
}
