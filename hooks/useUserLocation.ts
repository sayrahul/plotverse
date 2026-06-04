"use client";
/**
 * useUserLocation — wraps navigator.geolocation.watchPosition.
 * Returns the user's current GPS position (or null), an error string, and
 * a loading boolean. The watcher is cleaned up on unmount.
 */
import { useEffect, useRef, useState } from "react";

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface UserLocationHook {
  location: UserLocation | null;
  error: string | null;
  loading: boolean;
  /** Start watching (idempotent if already watching). */
  startWatching(): void;
  /** Stop watching. */
  stopWatching(): void;
}

export function useUserLocation(): UserLocationHook {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const watchIdRef              = useRef<number | null>(null);

  const startWatching = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    if (watchIdRef.current !== null) return; // already watching
    setLoading(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLoading(false);
        setError(null);
        setLocation({
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setLoading(false);
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setLoading(false);
    }
  };

  useEffect(() => () => { stopWatching(); }, []);

  return { location, error, loading, startWatching, stopWatching };
}
