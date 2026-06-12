/**
 * use-development-mode
 *
 * IMPORTANTE: NÃO importar readDevModeFlag nem nada de @amauc/shared aqui.
 * AsyncStorage é a única fonte de verdade para o estado do modo dev.
 * A versão do shared pode usar SecureStore ou APIs síncronas que não
 * funcionam no Expo Go / web.
 */
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEV_MODE_KEY = "@opusfreelas_dev_mode";

export function useDevelopmentMode() {
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(DEV_MODE_KEY)
      .then((stored) => {
        if (!cancelled) {
          setIsDevMode(stored === "true");
        }
      })
      .catch(() => {
        // AsyncStorage indisponível (ex: SSR/web sem suporte) → default false
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleDevMode = useCallback(async () => {
    const newMode = !isDevMode;
    setIsDevMode(newMode);
    try {
      await AsyncStorage.setItem(DEV_MODE_KEY, String(newMode));
    } catch {
      // ignora erro de storage
    }
  }, [isDevMode]);

  return { isDevMode, isLoading, toggleDevMode };
}
