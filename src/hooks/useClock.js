import { useEffect, useState } from "react";

/** A single shared "now" tick (1s interval) so every elapsed-time display across the app stays
 * in sync without each component running its own interval. */
export function useClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
