/**
 * Static UI config (not demo data). The app talks to the live API for all
 * events and photos; this only holds the host create-wizard event type chips.
 */

export const EVENT_TYPES = [
  { key: 'WEDDING', label: 'Wedding' },
  { key: 'BIRTHDAY', label: 'Party' },
  { key: 'SPORTS', label: 'Sports' },
  { key: 'TRAVEL', label: 'Travel' },
  { key: 'CORPORATE', label: 'Corporate' },
  { key: 'CONCERT', label: 'Concert' },
] as const;
