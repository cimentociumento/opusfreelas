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

const LOCATION_TIMEOUT_MS = 8000;

// Alguns navegadores/SOs (ex.: Windows com Location Services desligado) nunca
// chamam o callback de sucesso nem o de erro do getCurrentPosition, então o
// timeout nativo sozinho não é confiável — força a resolução no nível do JS
// para nunca deixar a tela presa em "carregando".
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Location request timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await withTimeout(Location.requestForegroundPermissionsAsync(), LOCATION_TIMEOUT_MS);
      if (status !== "granted") {
        setError("Permissão de localização negada. Usando localização padrão.");
        setLocation(DEFAULT_LOCATION);
        return;
      }

      const currentPosition = await withTimeout(Location.getCurrentPositionAsync({}), LOCATION_TIMEOUT_MS);
      const { latitude, longitude } = currentPosition.coords;

      // reverseGeocodeAsync não é suportado no Web (expo-location lança
      // GeocoderError sempre) — mantém as coordenadas reais já obtidas em
      // vez de descartá-las e cair no município padrão.
      let municipality = DEFAULT_LOCATION.municipality;
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        municipality = geocode[0]?.subregion || geocode[0]?.city || DEFAULT_LOCATION.municipality;
      } catch (geocodeErr) {
        console.warn("Reverse geocode indisponível, mantendo coordenadas reais:", geocodeErr);
      }

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
