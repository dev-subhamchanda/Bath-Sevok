import { useState, useEffect, useCallback, useRef } from "react";
import { useUiStore } from "@/stores/uiStore";

export interface GpsCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface PresetLocation {
  id: string;
  name: string;
  corridor: string;
  lat: number;
  lng: number;
}

export const NER_LOCATION_PRESETS: PresetLocation[] = [
  {
    id: "nh6-nongpoh",
    name: "Nongpoh Sector (KM 48)",
    corridor: "NH-6 Guwahati-Shillong",
    lat: 25.7200,
    lng: 91.8700
  },
  {
    id: "nh27-guwahati",
    name: "Guwahati Multi-modal Terminal",
    corridor: "NH-27 Assam Central Spine",
    lat: 26.1445,
    lng: 91.7362
  },
  {
    id: "nh13-bomdila",
    name: "Bomdila Pass (KM 62)",
    corridor: "NH-13 Trans-Arunachal Highway",
    lat: 27.2600,
    lng: 92.4200
  },
  {
    id: "nh29-kohima",
    name: "Kohima Ridgeline Pass",
    corridor: "NH-29 Dimapur-Kohima Pass",
    lat: 25.6751,
    lng: 94.1086
  },
  {
    id: "nh10-sevoke",
    name: "Teesta Gorge Corridor",
    corridor: "NH-10 Siliguri-Gangtok",
    lat: 27.0250,
    lng: 88.4800
  }
];

export function getReadableNerLocation(lat: number, lng: number): string {
  // Check proximity to key NER corridors (< 0.35 deg ~ 35km)
  for (const preset of NER_LOCATION_PRESETS) {
    const dLat = Math.abs(preset.lat - lat);
    const dLng = Math.abs(preset.lng - lng);
    if (dLat < 0.35 && dLng < 0.35) {
      return `${preset.name} • ${preset.corridor}`;
    }
  }

  // General regional quadrants
  if (lat > 27.0) return `Arunachal / North Assam Highlands (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
  if (lat < 24.5) return `Tripura / South Mizoram Sector (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
  if (lng > 93.5) return `Eastern Hill Corridors (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
  return `Brahmaputra Basin Corridor (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
}

export function useLiveLocation(defaultActive = false) {
  const setUserGpsLocation = useUiStore((s) => s.setUserGpsLocation);

  const [coords, setCoords] = useState<GpsCoordinates>(() => ({
    lat: 25.7200,
    lng: 91.8700,
    accuracy: 12,
    altitude: 485,
    heading: 184,
    speed: 42,
    timestamp: 1725600000000
  }));

  const [readableLocation, setReadableLocation] = useState<string>(
    "Nongpoh Sector (KM 48) • NH-6 Guwahati-Shillong"
  );
  const [isSharing, setIsSharing] = useState<boolean>(defaultActive);
  const [permissionStatus, setPermissionStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable" | "timeout"
  >("granted");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Updates coordinates and synchronizes with global UI store
  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition, isLive: boolean) => {
      const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
      const updatedCoords: GpsCoordinates = {
        lat: latitude,
        lng: longitude,
        accuracy: Math.round(accuracy),
        altitude: altitude !== null ? Math.round(altitude) : null,
        heading: heading !== null ? Math.round(heading) : null,
        speed: speed !== null ? Math.round(speed * 3.6) : null, // convert m/s to km/h
        timestamp: position.timestamp
      };

      setCoords(updatedCoords);
      const locText = getReadableNerLocation(latitude, longitude);
      setReadableLocation(locText);
      setPermissionStatus("granted");
      setErrorMessage(null);

      // Push to global store
      setUserGpsLocation({
        lat: latitude,
        lng: longitude,
        accuracy: Math.round(accuracy),
        isLive,
        readableLocation: locText
      });
    },
    [setUserGpsLocation]
  );

  const handlePositionError = useCallback(
    (error: GeolocationPositionError) => {
      let msg = "GPS Location unavailable";
      if (error.code === error.PERMISSION_DENIED) {
        setPermissionStatus("denied");
        msg = "Location permission denied by browser. Fallback coordinates active.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setPermissionStatus("unavailable");
        msg = "GPS hardware sensor unavailable. Using network approximation.";
      } else if (error.code === error.TIMEOUT) {
        setPermissionStatus("timeout");
        msg = "GPS location request timed out. Using last known corridor point.";
      }
      setErrorMessage(msg);
    },
    []
  );

  // Start / stop watchPosition based on isSharing
  useEffect(() => {
    if (!navigator.geolocation) return;

    if (isSharing) {
      const id = navigator.geolocation.watchPosition(
        (pos) => handlePositionUpdate(pos, true),
        (err) => handlePositionError(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      watchIdRef.current = id;
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isSharing, handlePositionUpdate, handlePositionError]);

  // Run initial probe on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePositionUpdate(pos, defaultActive),
      (err) => handlePositionError(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [handlePositionUpdate, handlePositionError, defaultActive]);

  // Toggle sharing handler
  const toggleLiveSharing = useCallback(() => {
    setIsSharing((prev) => !prev);
  }, []);

  // Preset setter for fallback
  const applyPresetLocation = useCallback(
    (preset: PresetLocation) => {
      const updatedCoords: GpsCoordinates = {
        lat: preset.lat,
        lng: preset.lng,
        accuracy: 8,
        altitude: 520,
        heading: 90,
        speed: 0,
        timestamp: Date.now()
      };
      setCoords(updatedCoords);
      const locText = `${preset.name} • ${preset.corridor}`;
      setReadableLocation(locText);
      setErrorMessage(null);

      setUserGpsLocation({
        lat: preset.lat,
        lng: preset.lng,
        accuracy: 8,
        isLive: isSharing,
        readableLocation: locText
      });
    },
    [isSharing, setUserGpsLocation]
  );

  return {
    coords,
    readableLocation,
    isSharing,
    permissionStatus,
    errorMessage,
    toggleLiveSharing,
    applyPresetLocation,
    presets: NER_LOCATION_PRESETS
  };
}
