/**
 * Tiny module-level membership store.
 *
 * expo-secure-store / AsyncStorage are not installed in this project, so we
 * keep the guest's memberId per event slug in module memory for the session.
 * Swap the get/set bodies for SecureStore if persistence is added later.
 */

import * as SecureStore from 'expo-secure-store';
import type { FindMeResult } from './api';

const memberIds = new Map<string, string>();

/**
 * Returning-guest phone. Persisted in SecureStore under `bocc_phone` (the same
 * key apps/web uses in localStorage) so the My-photos screen can pre-fill the
 * number a guest joined with, even on a fresh app launch. A module-memory
 * mirror keeps reads synchronous after the first set.
 */
const PHONE_STORAGE_KEY = 'bocc_phone';
let phoneCache: string | null = null;

export function setGuestPhone(phone: string): void {
  const value = phone.trim();
  if (!value) return;
  phoneCache = value;
  SecureStore.setItemAsync(PHONE_STORAGE_KEY, value).catch(() => {
    /* secure store unavailable */
  });
}

export function getGuestPhoneSync(): string | null {
  return phoneCache;
}

export async function loadGuestPhone(): Promise<string | null> {
  if (phoneCache) return phoneCache;
  try {
    const stored = await SecureStore.getItemAsync(PHONE_STORAGE_KEY);
    if (stored) phoneCache = stored;
  } catch {
    /* secure store unavailable */
  }
  return phoneCache;
}

export function setMemberId(eventSlug: string, memberId: string): void {
  if (!eventSlug || !memberId) return;
  memberIds.set(eventSlug, memberId);
}

export function getMemberId(eventSlug: string): string | undefined {
  return memberIds.get(eventSlug);
}

/**
 * Find-me result handoff. The selfie screen runs the match, the "me" screen
 * renders it; results carry Photo objects so they go through module memory
 * rather than route params.
 */
const findMeResults = new Map<string, FindMeResult>();

export function setFindMeResult(eventSlug: string, result: FindMeResult): void {
  if (!eventSlug) return;
  findMeResults.set(eventSlug, result);
}

export function getFindMeResult(eventSlug: string): FindMeResult | undefined {
  return findMeResults.get(eventSlug);
}
