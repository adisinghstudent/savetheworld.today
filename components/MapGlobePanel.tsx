"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Hardcoded conservation destination (Serengeti National Park, Tanzania)
const DESTINATION = { lng: 34.8333, lat: -2.3333 };

type LocationStatus = "idle" | "loading" | "success" | "error";

interface SpeciesLocations {
  countryCodes: string[];
  occurrences: { lat: number; lng: number; year?: number | null; country?: string | null }[];
}

const IUCN_CATEGORY_COLORS: Record<string, string> = {
  EX: "#000000", EW: "#000000",
  CR: "#cc3333", EN: "#d4500c",
  VU: "#cc9900", NT: "#228b22",
  LC: "#006666", DD: "#999999",
  NE: "#bbbbbb",
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const GlobeContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userLocation: { lng: number; lat: number } | null;
  setUserLocation: (loc: { lng: number; lat: number } | null) => void;
  locationStatus: LocationStatus;
  setLocationStatus: (status: LocationStatus) => void;
  hasSpeciesData: boolean;
  setHasSpeciesData: (has: boolean) => void;
  speciesLocations: SpeciesLocations | null;
  setSpeciesLocations: (loc: SpeciesLocations | null) => void;
  redListCategory: string | null;
  setRedListCategory: (category: string | null) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
  userLocation: null,
  setUserLocation: () => {},
  locationStatus: "idle",
  setLocationStatus: () => {},
  hasSpeciesData: false,
  setHasSpeciesData: () => {},
  speciesLocations: null,
  setSpeciesLocations: () => {},
  redListCategory: null,
  setRedListCategory: () => {},
});

export function GlobeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [hasSpeciesData, setHasSpeciesData] = useState(false);
  const [speciesLocations, setSpeciesLocations] = useState<SpeciesLocations | null>(null);
  const [redListCategory, setRedListCategory] = useState<string | null>(null);

  return (
    <GlobeContext.Provider
      value={{
        isOpen,
        setIsOpen,
        userLocation,
        setUserLocation,
        locationStatus,
        setLocationStatus,
        hasSpeciesData,
        setHasSpeciesData,
        speciesLocations,
        setSpeciesLocations,
        redListCategory,
        setRedListCategory,
      }}
    >
      {children}
    </GlobeContext.Provider>
  );
}

export function useGlobePanel() {
  return useContext(GlobeContext);
}

export function GlobeToggleButton() {
  const { isOpen, setIsOpen, hasSpeciesData } = useGlobePanel();

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20, transition: { duration: 0 } }}
          transition={{ duration: 0.3 }}
          onClick={() => setIsOpen(true)}
          className="relative rounded-lg bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Open globe"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 21a9 9 0 100-18 9 9 0 000 18z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.6 9h16.8M3.6 15h16.8"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z"
            />
          </svg>
          {hasSpeciesData && (
            <span className="absolute -right-1 -top-1 h-3 w-3">
              <span className="absolute inset-0 animate-ping rounded-full bg-[rgb(234,179,8)] opacity-75" />
              <span className="absolute inset-0 rounded-full bg-[rgb(234,179,8)]" />
            </span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function LocationButton() {
  const {
    isOpen,
    setIsOpen,
    userLocation,
    setUserLocation,
    locationStatus,
    setLocationStatus,
  } = useGlobePanel();

  const handleClick = useCallback(() => {
    if (userLocation) {
      setIsOpen(true);
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        });
        setLocationStatus("success");
        setIsOpen(true);
      },
      () => {
        setLocationStatus("error");
        setTimeout(() => setLocationStatus("idle"), 2000);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [userLocation, setIsOpen, setUserLocation, setLocationStatus]);

  const isLoading = locationStatus === "loading";
  const isError = locationStatus === "error";
  const isSuccess = locationStatus === "success";

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{
            opacity: 1,
            x: isError ? [0, -4, 4, -4, 4, 0] : 0,
          }}
          exit={{ opacity: 0, x: -20, transition: { duration: 0 } }}
          transition={
            isError
              ? { x: { duration: 0.4 }, opacity: { duration: 0.3 } }
              : { duration: 0.3 }
          }
          onClick={handleClick}
          className={`p-2 transition-colors ${
            isError
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
          aria-label="Show my location on globe"
        >
          {isLoading ? (
            <svg
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill={isSuccess ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// Layer/source IDs used for species data on the map
const SPECIES_LAYERS = [
  "species-countries-fill",
  "species-countries-line",
  "species-clusters",
  "species-cluster-count",
  "species-points",
];
const SPECIES_SOURCES = ["species-countries", "species-occurrences"];

function removeSpeciesLayers(map: mapboxgl.Map) {
  for (const id of SPECIES_LAYERS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of SPECIES_SOURCES) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

export default function MapGlobePanel() {
  const { isOpen, setIsOpen, userLocation, speciesLocations, redListCategory } = useGlobePanel();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const rotationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/adis123/cm2trla51000q01qw78sv431j",
      projection: "globe",
      zoom: 1.5,
      center: [30, 15],
    });

    mapRef.current = map;

    // Resize map when container changes size (fixes clipping during animation)
    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(mapContainerRef.current);

    // Remove space background — match app bg (white or black)
    map.on("style.load", () => {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const bg = isDark ? "#0a0a0a" : "#ffffff";
      map.setFog({
        color: isDark ? "rgba(10,10,10,0.1)" : "rgba(255,255,255,0.1)",
        "high-color": isDark ? "rgba(10,10,10,0)" : "rgba(255,255,255,0)",
        "space-color": bg,
        "star-intensity": 0,
        "horizon-blend": 0.02,
      });
      setMapReady(true);
    });

    // Slow auto-rotate
    const rotateGlobe = () => {
      if (!mapRef.current) return;
      const center = mapRef.current.getCenter();
      center.lng -= 0.2;
      mapRef.current.easeTo({ center, duration: 100, easing: (t) => t });
    };

    const interval = setInterval(rotateGlobe, 100);
    rotationIntervalRef.current = interval;

    // Pause rotation on interaction
    map.on("mousedown", () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
    });

    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [isOpen]);

  // Route drawing when userLocation changes
  useEffect(() => {
    if (!userLocation) return;

    const drawRoute = async (map: mapboxgl.Map) => {
      // Stop auto-rotation
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }

      // Remove previous markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Remove previous route layer/source if they exist
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getSource("route")) map.removeSource("route");

      // Place markers
      const userMarker = new mapboxgl.Marker({
        color: "rgb(234, 179, 8)",
        scale: 0.7,
      })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);

      const destMarker = new mapboxgl.Marker({
        color: "rgb(234, 179, 8)",
        scale: 0.9,
      })
        .setLngLat([DESTINATION.lng, DESTINATION.lat])
        .addTo(map);

      markersRef.current = [userMarker, destMarker];

      // Fetch driving route
      try {
        const coords = `${userLocation.lng},${userLocation.lat};${DESTINATION.lng},${DESTINATION.lat}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0].geometry;

          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: route,
            },
          });

          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "rgb(234, 179, 8)",
              "line-width": 3,
            },
          });
        }
      } catch {
        // If directions fail (e.g. overseas), just show markers
      }

      // Fit bounds to show both points
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([userLocation.lng, userLocation.lat]);
      bounds.extend([DESTINATION.lng, DESTINATION.lat]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 5 });
    };

    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      drawRoute(map);
    } else {
      map.once("style.load", () => drawRoute(map));
    }
  }, [userLocation]);

  // Species data layers — fires when map is ready AND species data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    removeSpeciesLayers(map);

    if (!speciesLocations) return;

    const categoryColor = redListCategory
      ? IUCN_CATEGORY_COLORS[redListCategory] || "rgb(234, 179, 8)"
      : "rgb(234, 179, 8)";
    const fillColor = redListCategory && IUCN_CATEGORY_COLORS[redListCategory]
      ? hexToRgba(IUCN_CATEGORY_COLORS[redListCategory], 0.3)
      : "rgba(234, 179, 8, 0.25)";

    const { countryCodes, occurrences } = speciesLocations;

    // Country highlights via Mapbox country boundaries
    if (countryCodes.length > 0) {
      if (!map.getSource("species-countries")) {
        map.addSource("species-countries", {
          type: "vector",
          url: "mapbox://mapbox.country-boundaries-v1",
        });
      }

      map.addLayer({
        id: "species-countries-fill",
        type: "fill",
        source: "species-countries",
        "source-layer": "country_boundaries",
        filter: ["in", ["get", "iso_3166_1"], ["literal", countryCodes]],
        paint: {
          "fill-color": fillColor,
        },
      });

      map.addLayer({
        id: "species-countries-line",
        type: "line",
        source: "species-countries",
        "source-layer": "country_boundaries",
        filter: ["in", ["get", "iso_3166_1"], ["literal", countryCodes]],
        paint: {
          "line-color": categoryColor,
          "line-width": 1,
        },
      });
    }

    // GBIF occurrence points (clustered)
    if (occurrences.length > 0) {
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: occurrences.map((o) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [o.lng, o.lat] },
          properties: { year: o.year, country: o.country },
        })),
      };

      map.addSource("species-occurrences", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });

      // Cluster circles
      map.addLayer({
        id: "species-clusters",
        type: "circle",
        source: "species-occurrences",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": categoryColor,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            12, 10,
            16, 50,
            22, 100,
            28,
          ],
          "circle-opacity": 0.7,
        },
      });

      // Cluster count labels
      map.addLayer({
        id: "species-cluster-count",
        type: "symbol",
        source: "species-occurrences",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
        },
        paint: {
          "text-color": "#fff",
        },
      });

      // Individual points
      map.addLayer({
        id: "species-points",
        type: "circle",
        source: "species-occurrences",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": categoryColor,
          "circle-radius": 4,
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fff",
        },
      });

      // Fit bounds to occurrences
      const bounds = new mapboxgl.LngLatBounds();
      for (const o of occurrences) {
        bounds.extend([o.lng, o.lat]);
      }
      if (!bounds.isEmpty()) {
        // Stop auto-rotation
        if (rotationIntervalRef.current) {
          clearInterval(rotationIntervalRef.current);
          rotationIntervalRef.current = null;
        }
        map.fitBounds(bounds, { padding: 60, maxZoom: 5 });
      }
    }
  }, [speciesLocations, mapReady, redListCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 520 }}
          exit={{ width: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="flex h-screen flex-col overflow-hidden border-r border-gray-200/60 bg-[#f8f7f4] dark:border-gray-800/60 dark:bg-black"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <span className="font-serif text-sm text-gray-600 dark:text-gray-400">
              Species Map
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
              aria-label="Close globe"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Map Container */}
          <div className="flex-1 overflow-hidden">
            <div ref={mapContainerRef} className="h-full w-full" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
