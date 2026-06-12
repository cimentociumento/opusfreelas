/**
 * packages/shared/src/dev-mode.ts  (CRIAR ESTE ARQUIVO no pacote shared)
 *
 * Se o shared exporta `readDevModeFlag` com SecureStore ou chamadas síncronas,
 * substitua pelo conteúdo abaixo. A função precisa ser assíncrona e usar
 * apenas AsyncStorage — que é seguro no Expo Go e na web.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEV_MODE_KEY = "@opusfreelas_dev_mode";

/**
 * Lê o estado do modo dev de forma assíncrona.
 * Retorna false em caso de erro (ex: ambiente sem storage).
 */
export async function readDevModeFlag(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(DEV_MODE_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

/**
 * Grava o estado do modo dev.
 */
export async function writeDevModeFlag(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(DEV_MODE_KEY, String(value));
  } catch {
    // ignora
  }
}
