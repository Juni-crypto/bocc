/**
 * Tiny module-level membership store.
 *
 * expo-secure-store / AsyncStorage are not installed in this project, so we
 * keep the guest's memberId per event slug in module memory for the session.
 * Swap the get/set bodies for SecureStore if persistence is added later.
 */

import type { FindMeResult } from './api';

const memberIds = new Map<string, string>();

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
