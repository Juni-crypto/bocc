import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';

/**
 * Resolve the event slug reliably inside the /event/[slug] tab navigator.
 *
 * `useLocalSearchParams` can return an empty slug on a tab that was switched to
 * (rather than navigated to directly), because the parent dynamic segment is
 * not always reflected in the focused tab's local params. Falling back to the
 * global params (read from the full URL) keeps the slug correct on every tab.
 */
export function useEventSlug(): string {
  const local = useLocalSearchParams<{ slug?: string }>();
  const global = useGlobalSearchParams<{ slug?: string }>();
  return (local.slug || global.slug || '') as string;
}
