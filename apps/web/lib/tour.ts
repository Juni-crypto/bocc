"use client";

// Reusable driver.js guided tours, themed to the BOCC dark + lime brand.
// All entry points are no-ops on the server and only run when invoked from a
// client effect or click handler, so SSR is never touched.

import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";

const POPOVER_CLASS = "bocc-tour";

/**
 * Run a driver.js tour with the shared BOCC theme. Skippable by default
 * (Esc / overlay click / Done). Steps whose target element is missing are
 * dropped so a partially-rendered page never strands the tour.
 */
export function runTour(steps: DriveStep[], opts?: Config) {
  if (typeof window === "undefined") return;

  const present = steps.filter((s) => {
    const el = s.element;
    if (!el) return true; // centered, element-less step
    if (typeof el === "string") return Boolean(document.querySelector(el));
    return true; // already an element/node
  });
  if (present.length === 0) return;

  const d = driver({
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.7,
    stagePadding: 6,
    stageRadius: 12,
    popoverClass: POPOVER_CLASS,
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    progressText: "{{current}} of {{total}}",
    ...opts,
    steps: present,
  });
  d.drive();
  return d;
}

const sel = (tour: string) => `[data-tour="${tour}"]`;

/* ------------------------------------------------------------------ */
/* Admin console tour                                                  */
/* ------------------------------------------------------------------ */

export function startAdminTour() {
  runTour([
    {
      popover: {
        title: "Welcome to the admin console",
        description:
          "A quick tour of the controls that run the whole platform. You can leave any time with Esc.",
      },
    },
    {
      element: sel("admin-totals"),
      popover: {
        title: "Platform metrics",
        description:
          "Live totals across every host and event: users, events, photos pooled, pending moderation, storage and more.",
      },
    },
    {
      element: sel("admin-tour-events"),
      popover: {
        title: "Manage every event",
        description:
          "Jump to the events table to edit status or visibility for any event on the platform.",
      },
    },
    {
      element: sel("admin-event-row"),
      popover: {
        title: "An event row",
        description:
          "Each row lets you flip an event between DRAFT, LIVE and ENDED, or change who can see it.",
      },
    },
    {
      element: sel("admin-event-delete"),
      popover: {
        title: "Delete an event",
        description:
          "Remove an event entirely. You confirm first, so an accidental tap never wipes anything.",
      },
    },
    {
      element: sel("admin-tour-users"),
      popover: {
        title: "Manage people",
        description: "Open the users area to add hosts, change roles and remove accounts.",
      },
    },
    {
      element: sel("admin-create-host"),
      popover: {
        title: "Create a host",
        description:
          "Add a new host (or admin) with a name, email and password. Hosts can run their own events.",
      },
    },
    {
      element: sel("admin-role-toggle"),
      popover: {
        title: "Change a role",
        description:
          "Promote a host to admin or demote them back to a host with one tap.",
      },
    },
    {
      element: sel("admin-user-delete"),
      popover: {
        title: "Delete a user",
        description:
          "Remove an account for good. You confirm before anything is deleted.",
      },
    },
  ]);
}

/* ------------------------------------------------------------------ */
/* Host app onboarding tour                                            */
/* ------------------------------------------------------------------ */

export function startHostTour() {
  runTour([
    {
      popover: {
        title: "How your event works",
        description:
          "A 60-second tour of your host dashboard. Press Esc whenever you want to stop.",
      },
    },
    {
      element: sel("host-qr"),
      popover: {
        title: "Your QR and share link",
        description:
          "This is how the crew joins. Show the QR, or copy the link and drop it in a chat. Anyone who scans can start adding photos.",
      },
    },
    {
      element: sel("host-stats"),
      popover: {
        title: "Live stats",
        description:
          "Crew joined, photos pooled, faces found and storage used, all updating in real time as shots come in.",
      },
    },
    {
      element: sel("host-edit-settings"),
      popover: {
        title: "Edit settings",
        description:
          "Rename the event, change visibility, set photo caps, the upload window, moderation and face matching. Changes apply live for the crew.",
      },
    },
    {
      element: sel("host-end-event"),
      popover: {
        title: "End the event",
        description:
          "When the night is over, end the event to close uploads. The crew can no longer add photos after that.",
      },
    },
    {
      element: sel("host-gallery"),
      popover: {
        title: "Photos and people",
        description:
          "New uploads land in Recent uploads live, and anything held for review shows in the moderation queue below.",
      },
    },
  ]);
}

/* ------------------------------------------------------------------ */
/* First-visit auto-run guards                                         */
/* ------------------------------------------------------------------ */

/** Run `start` once per browser, keyed by a localStorage flag. */
export function autoRunOnce(storageKey: string, start: () => void) {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(storageKey)) return;
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // storage unavailable: still run the tour, just no persistence
  }
  // Defer so target elements have mounted before driver measures them.
  window.setTimeout(start, 500);
}

export const ADMIN_TOUR_SEEN_KEY = "bocc_admin_tour_seen";
export const HOST_TOUR_SEEN_KEY = "bocc_host_tour_seen";
