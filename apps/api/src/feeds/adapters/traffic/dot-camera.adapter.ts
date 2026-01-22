/**
 * DOT Camera Adapter
 *
 * Multi-state DOT traffic camera aggregation.
 * Supports CA, NY, TX, FL, PA, IL with state-specific parsers.
 */

import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { db } from '../../../db';
import { dotCameras, type NewDOTCamera, type DOTCamera } from '../../../db/schema/infrastructure';
import {
  BaseFeedAdapter,
  type FeedConfig,
  type FeedFilterOptions,
  type FeedFetchResult,
  type NormalizedFeedItem,
} from '../../adapter.interface';
import type {
  DOTSupportedState,
  DOTCameraStatus,
  GeoBounds,
} from '../../types/critical-infrastructure.types';
import { DOT_SUPPORTED_STATES } from '../../types/critical-infrastructure.types';

// State DOT API configurations
interface StateAPIConfig {
  state: DOTSupportedState;
  name: string;
  apiUrl: string;
  apiType: 'json' | 'xml' | 'geojson';
  parser: (data: unknown) => ParsedCamera[];
}

interface ParsedCamera {
  name: string;
  latitude: number;
  longitude: number;
  route?: string;
  imageUrl?: string;
  videoUrl?: string;
  status: DOTCameraStatus;
  sourceId: string;
}

// California DOT (Caltrans) API
const parseCaltrans = (data: unknown): ParsedCamera[] => {
  const cameras: ParsedCamera[] = [];
  try {
    const json = data as {
      features?: Array<{
        properties: {
          id: string;
          routenum?: string;
          location?: string;
          direction?: string;
          imageUrl?: string;
        };
        geometry: {
          coordinates: [number, number];
        };
      }>;
    };

    for (const feature of json.features || []) {
      const props = feature.properties;
      const coords = feature.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        cameras.push({
          name: props.location || `CA Route ${props.routenum}`,
          latitude: coords[1],
          longitude: coords[0],
          route: props.routenum,
          imageUrl: props.imageUrl,
          status: 'active',
          sourceId: props.id,
        });
      }
    }
  } catch {
    // Parsing error
  }
  return cameras;
};

// Texas DOT API
const parseTxDOT = (data: unknown): ParsedCamera[] => {
  const cameras: ParsedCamera[] = [];
  try {
    const json = data as {
      cameras?: Array<{
        cameraId: string;
        cameraName?: string;
        latitude?: number;
        longitude?: number;
        roadway?: string;
        imageURL?: string;
        videoURL?: string;
        status?: string;
      }>;
    };

    for (const cam of json.cameras || []) {
      if (cam.latitude && cam.longitude) {
        cameras.push({
          name: cam.cameraName || `TX ${cam.roadway}`,
          latitude: cam.latitude,
          longitude: cam.longitude,
          route: cam.roadway,
          imageUrl: cam.imageURL,
          videoUrl: cam.videoURL,
          status: cam.status === 'active' ? 'active' : 'unknown',
          sourceId: cam.cameraId,
        });
      }
    }
  } catch {
    // Parsing error
  }
  return cameras;
};

// New York DOT API
const parseNYDOT = (data: unknown): ParsedCamera[] => {
  const cameras: ParsedCamera[] = [];
  try {
    const json = data as {
      data?: Array<{
        id: string;
        name?: string;
        lat?: number;
        lon?: number;
        highway?: string;
        img?: string;
        disabled?: boolean;
      }>;
    };

    for (const cam of json.data || []) {
      if (cam.lat && cam.lon) {
        cameras.push({
          name: cam.name || `NY ${cam.highway}`,
          latitude: cam.lat,
          longitude: cam.lon,
          route: cam.highway,
          imageUrl: cam.img,
          status: cam.disabled ? 'inactive' : 'active',
          sourceId: cam.id,
        });
      }
    }
  } catch {
    // Parsing error
  }
  return cameras;
};

// Florida DOT API
const parseFLDOT = (data: unknown): ParsedCamera[] => {
  const cameras: ParsedCamera[] = [];
  try {
    const json = data as {
      cameras?: Array<{
        cameraId: string;
        description?: string;
        latitude?: number;
        longitude?: number;
        roadwayName?: string;
        cctvImageURL?: string;
        streamingVideoURL?: string;
        isActive?: boolean;
      }>;
    };

    for (const cam of json.cameras || []) {
      if (cam.latitude && cam.longitude) {
        cameras.push({
          name: cam.description || `FL ${cam.roadwayName}`,
          latitude: cam.latitude,
          longitude: cam.longitude,
          route: cam.roadwayName,
          imageUrl: cam.cctvImageURL,
          videoUrl: cam.streamingVideoURL,
          status: cam.isActive ? 'active' : 'inactive',
          sourceId: cam.cameraId,
        });
      }
    }
  } catch {
    // Parsing error
  }
  return cameras;
};

// Pennsylvania DOT API
const parsePennDOT = (data: unknown): ParsedCamera[] => {
  const cameras: ParsedCamera[] = [];
  try {
    const json = data as {
      cameras?: Array<{
        id: string;
        title?: string;
        latitude?: number;
        longitude?: number;
        route?: string;
        url?: string;
        online?: boolean;
      }>;
    };

    for (const cam of json.cameras || []) {
      if (cam.latitude && cam.longitude) {
        cameras.push({
          name: cam.title || `PA ${cam.route}`,
          latitude: cam.latitude,
          longitude: cam.longitude,
          route: cam.route,
          imageUrl: cam.url,
          status: cam.online ? 'active' : 'inactive',
          sourceId: cam.id,
        });
      }
    }
  } catch {
    // Parsing error
  }
  return cameras;
};

// Illinois DOT API
const parseILDOT = (data: unknown): ParsedCamera[] => {
  const cameras: ParsedCamera[] = [];
  try {
    const json = data as {
      cameras?: Array<{
        cameraId: string;
        location?: string;
        lat?: number;
        lng?: number;
        roadway?: string;
        imageUrl?: string;
        active?: boolean;
      }>;
    };

    for (const cam of json.cameras || []) {
      if (cam.lat && cam.lng) {
        cameras.push({
          name: cam.location || `IL ${cam.roadway}`,
          latitude: cam.lat,
          longitude: cam.lng,
          route: cam.roadway,
          imageUrl: cam.imageUrl,
          status: cam.active ? 'active' : 'inactive',
          sourceId: cam.cameraId,
        });
      }
    }
  } catch {
    // Parsing error
  }
  return cameras;
};

// State API configurations
// Note: These URLs are illustrative. Actual DOT APIs vary by state and may require registration.
const STATE_APIS: StateAPIConfig[] = [
  {
    state: 'CA',
    name: 'Caltrans',
    apiUrl: 'https://cwwp2.dot.ca.gov/data/d3/cctv/cctvStatusD03.json',
    apiType: 'geojson',
    parser: parseCaltrans,
  },
  {
    state: 'TX',
    name: 'TxDOT',
    apiUrl: 'https://its.txdot.gov/api/v1/cctv/cameras',
    apiType: 'json',
    parser: parseTxDOT,
  },
  {
    state: 'NY',
    name: 'NYSDOT',
    apiUrl: 'https://511ny.org/api/getContentByType.php?content_type=cameras',
    apiType: 'json',
    parser: parseNYDOT,
  },
  {
    state: 'FL',
    name: 'FDOT',
    apiUrl: 'https://fl511.com/api/getCameras',
    apiType: 'json',
    parser: parseFLDOT,
  },
  {
    state: 'PA',
    name: 'PennDOT',
    apiUrl: 'https://511pa.com/api/cameras',
    apiType: 'json',
    parser: parsePennDOT,
  },
  {
    state: 'IL',
    name: 'IDOT',
    apiUrl: 'https://www.travelmidwest.com/api/cameras/IL',
    apiType: 'json',
    parser: parseILDOT,
  },
];

/**
 * DOT Camera Adapter
 */
export class DOTCameraAdapter extends BaseFeedAdapter {
  readonly type = 'traffic_camera' as const;
  readonly name = 'DOT Traffic Cameras';
  readonly description = 'Multi-state DOT traffic camera feeds (CA, NY, TX, FL, PA, IL)';
  readonly requiredConfig = [];

  async fetch(config: FeedConfig, filters?: FeedFilterOptions): Promise<FeedFetchResult> {
    const options = config.options as Record<string, unknown>;

    // Get target states
    let targetStates = (options.states as DOTSupportedState[]) || [];
    if (targetStates.length === 0) {
      targetStates = [...DOT_SUPPORTED_STATES];
    }

    // Validate states
    targetStates = targetStates.filter((s) =>
      (DOT_SUPPORTED_STATES as readonly string[]).includes(s)
    );

    try {
      // Fetch cameras from each state
      const allCameras: Array<ParsedCamera & { state: DOTSupportedState; agency: string }> = [];

      await Promise.all(
        targetStates.map(async (state) => {
          const stateConfig = STATE_APIS.find((s) => s.state === state);
          if (!stateConfig) return;

          try {
            const cameras = await this.fetchStateCameras(stateConfig);
            for (const cam of cameras) {
              allCameras.push({
                ...cam,
                state,
                agency: stateConfig.name,
              });
            }
          } catch (error) {
            console.error(`[DOTCamera] Failed to fetch ${state} cameras:`, error);
          }
        })
      );

      // Apply bounds filter if provided
      let filteredCameras = allCameras;
      if (filters?.bounds) {
        const { north, south, east, west } = filters.bounds;
        filteredCameras = allCameras.filter(
          (c) =>
            c.latitude >= south && c.latitude <= north && c.longitude >= west && c.longitude <= east
        );
      }

      // Process and store cameras
      const { items, storedCameras } = this.processCameras(filteredCameras, filters);

      // Update camera records in database
      if (storedCameras.length > 0) {
        await this.upsertCameras(storedCameras);
      }

      return {
        items,
        failedCount: 0,
        errors: [],
        hasMore: false,
      };
    } catch (error) {
      return {
        items: [],
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'DOT camera fetch failed'],
        hasMore: false,
      };
    }
  }

  /**
   * Fetch cameras from a specific state
   */
  private async fetchStateCameras(config: StateAPIConfig): Promise<ParsedCamera[]> {
    try {
      const response = await fetch(config.apiUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SituationMonitor/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`${config.state} API error: ${response.status}`);
      }

      const data: unknown = await response.json();
      return config.parser(data);
    } catch (error) {
      console.error(`[DOTCamera] ${config.state} fetch error:`, error);
      return [];
    }
  }

  /**
   * Process cameras into feed items
   */
  private processCameras(
    cameras: Array<ParsedCamera & { state: DOTSupportedState; agency: string }>,
    filters?: FeedFilterOptions
  ): {
    items: NormalizedFeedItem[];
    storedCameras: NewDOTCamera[];
  } {
    const items: NormalizedFeedItem[] = [];
    const storedCameras: NewDOTCamera[] = [];

    for (const camera of cameras) {
      const externalId = `dotcam:${camera.state}:${camera.sourceId}`;

      items.push({
        externalId,
        type: 'traffic_camera',
        title: camera.name,
        content: `Traffic camera on ${camera.route || 'highway'} in ${camera.state}`,
        url: camera.imageUrl,
        timestamp: new Date(),
        location: {
          latitude: camera.latitude,
          longitude: camera.longitude,
          name: camera.name,
        },
        severity: camera.status === 'incident_detected' ? 'high' : 'info',
        metadata: {
          state: camera.state,
          route: camera.route,
          imageUrl: camera.imageUrl,
          videoUrl: camera.videoUrl,
          status: camera.status,
          agency: camera.agency,
          sourceId: camera.sourceId,
        },
      });

      storedCameras.push({
        id: uuidv4(),
        name: camera.name,
        state: camera.state,
        route: camera.route || null,
        latitude: camera.latitude,
        longitude: camera.longitude,
        status: camera.status,
        imageUrl: camera.imageUrl || null,
        videoUrl: camera.videoUrl || null,
        lastImageTime: new Date(),
        sourceAgency: camera.agency,
        sourceId: camera.sourceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Apply limit
    const limited = filters?.limit ? items.slice(0, filters.limit) : items;

    return {
      items: limited,
      storedCameras,
    };
  }

  /**
   * Upsert cameras in database (update existing, insert new)
   */
  private async upsertCameras(cameras: NewDOTCamera[]): Promise<void> {
    const BATCH_SIZE = 100;

    for (let i = 0; i < cameras.length; i += BATCH_SIZE) {
      const batch = cameras.slice(i, i + BATCH_SIZE);

      // Get existing cameras by source ID
      const sourceIds = batch.map((c) => c.sourceId);
      const existing = await db.query.dotCameras.findMany({
        where: and(
          inArray(dotCameras.sourceId, sourceIds),
          inArray(
            dotCameras.sourceAgency,
            batch.map((c) => c.sourceAgency)
          )
        ),
      });

      const existingMap = new Map(existing.map((e) => [`${e.sourceAgency}:${e.sourceId}`, e]));

      const toInsert: NewDOTCamera[] = [];
      const toUpdate: Array<{ id: string; data: Partial<NewDOTCamera> }> = [];

      for (const camera of batch) {
        const key = `${camera.sourceAgency}:${camera.sourceId}`;
        const existingCam = existingMap.get(key);

        if (existingCam) {
          // Update existing
          toUpdate.push({
            id: existingCam.id,
            data: {
              status: camera.status,
              imageUrl: camera.imageUrl,
              videoUrl: camera.videoUrl,
              lastImageTime: new Date(),
              updatedAt: new Date(),
            },
          });
        } else {
          // Insert new
          toInsert.push(camera);
        }
      }

      // Batch insert
      if (toInsert.length > 0) {
        await db.insert(dotCameras).values(toInsert);
      }

      // Batch update
      for (const update of toUpdate) {
        await db.update(dotCameras).set(update.data).where(eq(dotCameras.id, update.id));
      }
    }
  }

  /**
   * Get cameras from database for a specific area
   */
  async getCamerasInBounds(bounds: GeoBounds, states?: DOTSupportedState[]): Promise<DOTCamera[]> {
    const conditions = [
      // Latitude bounds
      // Longitude bounds - handled inline
    ];

    if (states && states.length > 0) {
      conditions.push(inArray(dotCameras.state, states));
    }

    return db.query.dotCameras.findMany({
      where: and(...conditions),
      limit: 1000,
    });
  }

  override getDefaultConfig(): Partial<FeedConfig> {
    return {
      ...super.getDefaultConfig(),
      pollInterval: 300000, // 5 minutes
      options: {
        states: [], // All supported states
      },
    };
  }
}

// Export singleton instance
export const dotCameraAdapter = new DOTCameraAdapter();
