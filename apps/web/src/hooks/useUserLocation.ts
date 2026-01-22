/**
 * User Geolocation Hook
 *
 * Gets the user's current location using the browser's Geolocation API.
 * Falls back to a default location if geolocation is unavailable or denied.
 */

import { useEffect, useState } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface UseUserLocationOptions {
  /** Enable high accuracy mode (uses more battery) */
  enableHighAccuracy?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum age of cached position in milliseconds */
  maximumAge?: number;
  /** Default location to use if geolocation fails */
  fallback?: [number, number];
}

export interface UseUserLocationResult {
  location: UserLocation | null;
  error: GeolocationPositionError | null;
  isLoading: boolean;
  isSupported: boolean;
}

// Default fallback: Washington DC (neutral default for most users)
const DEFAULT_FALLBACK: [number, number] = [-77.0369, 38.9072];

export function useUserLocation(options: UseUserLocationOptions = {}): UseUserLocationResult {
  const {
    enableHighAccuracy = false,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    fallback = DEFAULT_FALLBACK,
  } = options;

  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  useEffect(() => {
    if (!isSupported) {
      setLocation({
        longitude: fallback[0],
        latitude: fallback[1],
      });
      setIsLoading(false);
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setError(null);
      setIsLoading(false);
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn('[Geolocation] Error getting position:', err.message);
      setError(err);
      // Fall back to default location
      setLocation({
        longitude: fallback[0],
        latitude: fallback[1],
      });
      setIsLoading(false);
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });
  }, [isSupported, enableHighAccuracy, timeout, maximumAge, fallback[0], fallback[1]]);

  return {
    location,
    error,
    isLoading,
    isSupported,
  };
}
