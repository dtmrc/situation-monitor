import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import { api } from '@/lib/api';

import type { ViewportBounds, ViewportDataResponse } from '../types';

/** ═══════════════════════════════════════════════════════════════════════════
 *  VIEWPORT DATA HOOK
 *  ═══════════════════════════════════════════════════════════════════════════
 *
 *  Fetches map data for the current viewport bounds with debouncing.
 *  Uses TanStack Query for caching and request management.
 *
 *  Features:
 *  - 300ms debounce on bounds changes to prevent excessive API calls
 *  - Automatic refetch on bounds change
 *  - Query caching based on bounds + projectId
 *  - Loading and error states
 */

interface UseViewportDataOptions {
  /** Project ID for scoping the data */
  projectId?: string;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Current zoom level */
  zoom?: number;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
}

interface UseViewportDataReturn {
  /** Viewport data from the API */
  data: ViewportDataResponse | undefined;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query is fetching (including background refetch) */
  isFetching: boolean;
  /** Error if the query failed */
  error: Error | null;
  /** Function to update bounds (debounced) */
  updateBounds: (bounds: ViewportBounds) => void;
  /** Current bounds being queried */
  currentBounds: ViewportBounds | null;
}

/**
 * Fetch viewport data from the API
 */
async function fetchViewportData(
  projectId: string,
  bounds: ViewportBounds,
  zoom: number
): Promise<ViewportDataResponse> {
  const params = new URLSearchParams({
    projectId,
    west: bounds.west.toString(),
    south: bounds.south.toString(),
    east: bounds.east.toString(),
    north: bounds.north.toString(),
    zoom: zoom.toString(),
  });

  return api.get<ViewportDataResponse>(`/v1/map/viewport?${params.toString()}`);
}

/**
 * Create a stable query key from bounds
 */
function boundsToKey(bounds: ViewportBounds): string {
  // Round to 4 decimal places for stable keys while still being precise enough
  return `${bounds.west.toFixed(4)},${bounds.south.toFixed(4)},${bounds.east.toFixed(4)},${bounds.north.toFixed(4)}`;
}

export function useViewportData(options: UseViewportDataOptions = {}): UseViewportDataReturn {
  const { projectId, enabled = true, zoom = 5, debounceMs = 300 } = options;

  // Track the debounced bounds and zoom internally
  const [debouncedBounds, setDebouncedBounds] = useState<ViewportBounds | null>(null);
  const [debouncedZoom, setDebouncedZoom] = useState<number>(zoom);

  // Debounced setter for bounds and zoom together
  const debouncedSetViewport = useDebouncedCallback((bounds: ViewportBounds, newZoom: number) => {
    setDebouncedBounds(bounds);
    setDebouncedZoom(newZoom);
  }, debounceMs);

  // Update bounds function exposed to consumers - now accepts zoom too
  const updateBounds = useCallback(
    (bounds: ViewportBounds) => {
      debouncedSetViewport(bounds, zoom);
    },
    [debouncedSetViewport, zoom]
  );

  // Generate query key based on bounds and project
  const queryKey = useMemo(() => {
    if (!debouncedBounds || !projectId) return null;
    return ['map', 'viewport', projectId, boundsToKey(debouncedBounds), debouncedZoom];
  }, [projectId, debouncedBounds, debouncedZoom]);

  // TanStack Query for fetching viewport data
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: queryKey ?? ['map', 'viewport', 'disabled'],
    queryFn: () => {
      if (!projectId || !debouncedBounds) {
        throw new Error('Missing projectId or bounds');
      }
      return fetchViewportData(projectId, debouncedBounds, debouncedZoom);
    },
    enabled: enabled && !!projectId && !!debouncedBounds,
    // Keep previous data while fetching new viewport
    placeholderData: (previousData) => previousData,
    // Stale after 30 seconds (data can change via WebSocket)
    staleTime: 30000,
    // Cache for 5 minutes
    gcTime: 5 * 60 * 1000,
    // Retry once on failure
    retry: 1,
    // Don't refetch on window focus (WebSocket handles real-time)
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    isFetching,
    error: error,
    updateBounds,
    currentBounds: debouncedBounds,
  };
}
