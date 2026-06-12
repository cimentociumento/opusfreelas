import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const DEV_MODE_KEY = "opusfreelas_dev_mode";
const DEV_SESSION_KEY = "opusfreelas_dev_session";

type DevelopmentModeContextValue = {
  isDevMode: boolean;
  isLoading: boolean;
  devSessionActive: boolean;
  toggleDevMode: () => Promise<void>;
  enterDevSession: () => Promise<void>;
  exitDevSession: () => Promise<void>;
};

const DevelopmentModeContext = createContext<DevelopmentModeContextValue | null>(null);

export async function readDevModeFlag(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  try {
    const stored = await SecureStore.getItemAsync(DEV_MODE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

async function readDevSessionFlag(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  try {
    const stored = await SecureStore.getItemAsync(DEV_SESSION_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

async function writeDevModeFlag(enabled: boolean): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  await SecureStore.setItemAsync(DEV_MODE_KEY, String(enabled));
}

async function writeDevSessionFlag(active: boolean): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  if (active) {
    await SecureStore.setItemAsync(DEV_SESSION_KEY, "true");
  } else {
    await SecureStore.deleteItemAsync(DEV_SESSION_KEY);
  }
}

export function DevelopmentModeProvider({ children }: { children: ReactNode }) {
  const [isDevMode, setIsDevMode] = useState(false);
  const [devSessionActive, setDevSessionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [devMode, devSession] = await Promise.all([readDevModeFlag(), readDevSessionFlag()]);
        if (!cancelled) {
          setIsDevMode(devMode);
          setDevSessionActive(devMode && devSession);
        }
      } catch {
        if (!cancelled) {
          setIsDevMode(false);
          setDevSessionActive(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const enterDevSession = useCallback(async () => {
    setDevSessionActive(true);
    try {
      await writeDevSessionFlag(true);
    } catch {
      // Mantém sessão em memória.
    }
  }, []);

  const exitDevSession = useCallback(async () => {
    setDevSessionActive(false);
    try {
      await writeDevSessionFlag(false);
    } catch {
      // Ignora falha de persistência.
    }
  }, []);

  const toggleDevMode = useCallback(async () => {
    const newMode = !isDevMode;
    setIsDevMode(newMode);
    if (!newMode) {
      await exitDevSession();
    }
    try {
      await writeDevModeFlag(newMode);
    } catch {
      // Mantém o estado em memória mesmo se o armazenamento falhar.
    }
  }, [isDevMode, exitDevSession]);

  const value = useMemo(
    () => ({
      isDevMode,
      isLoading,
      devSessionActive,
      toggleDevMode,
      enterDevSession,
      exitDevSession,
    }),
    [isDevMode, isLoading, devSessionActive, toggleDevMode, enterDevSession, exitDevSession]
  );

  return (
    <DevelopmentModeContext.Provider value={value}>{children}</DevelopmentModeContext.Provider>
  );
}

export function useDevelopmentMode(): DevelopmentModeContextValue {
  const context = useContext(DevelopmentModeContext);
  if (!context) {
    throw new Error("useDevelopmentMode deve ser usado dentro de DevelopmentModeProvider");
  }
  return context;
}
