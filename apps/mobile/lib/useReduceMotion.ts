import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Tracks the OS "Reduce Motion" accessibility setting so animations can fall
 * back to a static state. Returns true when the user has asked for reduced
 * motion. Subscribes to live changes and cleans up on unmount.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (alive) setReduce(enabled);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduce(enabled),
    );

    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
