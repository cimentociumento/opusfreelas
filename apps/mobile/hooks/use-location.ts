import { useState, useEffect } from "react";
import * as Location from "expo-location";

export type LocationData = {
  latitude: number;
  longitude: number;
  municipality: string;
};

// Default AMAUC location (Concórdia)
export const DEFAULT_LOCATION: LocationData = {
  latitude: -27.23,
  longitude: -52.02,
  municipality: "Concórdia",
};

export function useLocation() {
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permissão de localização negada. Usando localização padrão.");
        setLocation(DEFAULT_LOCATION);
        setLoading(false);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentPosition.coords;

      // Reverse geocode to get municipality
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const municipality = geocode[0]?.subregion || geocode[0]?.city || DEFAULT_LOCATION.municipality;

      setLocation({ latitude, longitude, municipality });
    } catch (err) {
      console.error("Error fetching location:", err);
      setError("Erro ao obter localização. Usando localização padrão.");
      setLocation(DEFAULT_LOCATION);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  return { location, loading, error, refresh: fetchLocation };
}
