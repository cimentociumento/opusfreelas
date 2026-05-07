import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_MODE_KEY = '@opusfreelas_dev_mode';

export function useDevelopmentMode() {
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load development mode state from storage
  useEffect(() => {
    const loadDevMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(DEV_MODE_KEY);
        const devMode = stored === 'true';
        setIsDevMode(devMode);
        console.log(`🛠️ Initial dev mode state: ${devMode}`);
      } catch (error) {
        console.log('Failed to load dev mode state:', error);
        setIsDevMode(false); // Default to false on error
      } finally {
        setIsLoading(false);
      }
    };
    loadDevMode();
  }, []);

  const toggleDevMode = useCallback(async () => {
    try {
      const newMode = !isDevMode;
      setIsDevMode(newMode);
      await AsyncStorage.setItem(DEV_MODE_KEY, String(newMode));
      console.log(`🛠️ Development mode ${newMode ? 'ENABLED' : 'DISABLED'}`);
      console.log(`🛠️ All screens will now ${newMode ? 'use MOCK data' : 'use REAL API'}`);
    } catch (error) {
      console.log('Failed to save dev mode state:', error);
    }
  }, [isDevMode]);

  return {
    isDevMode,
    isLoading,
    toggleDevMode,
  };
}
