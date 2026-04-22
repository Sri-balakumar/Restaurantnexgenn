import { useRef, useCallback } from 'react';

// Wraps a handler so rapid/double presses fire it only once.
// - Ignores presses within `cooldownMs` of the last accepted press.
// - If the handler returns a Promise, the button stays locked until it settles.
// Usage:
//   const onPress = usePressOnce(async () => { await doPayment(); });
//   <TouchableOpacity onPress={onPress}>
export default function usePressOnce(handler, cooldownMs = 600) {
  const busyRef = useRef(false);
  const lastPressRef = useRef(0);

  return useCallback((...args) => {
    const now = Date.now();
    if (busyRef.current) return;
    if (now - lastPressRef.current < cooldownMs) return;
    lastPressRef.current = now;
    busyRef.current = true;

    let result;
    try {
      result = handler?.(...args);
    } catch (e) {
      busyRef.current = false;
      throw e;
    }

    if (result && typeof result.then === 'function') {
      Promise.resolve(result).finally(() => { busyRef.current = false; });
    } else {
      // Short lock even for sync handlers to absorb rapid double-taps.
      setTimeout(() => { busyRef.current = false; }, cooldownMs);
    }
    return result;
  }, [handler, cooldownMs]);
}
