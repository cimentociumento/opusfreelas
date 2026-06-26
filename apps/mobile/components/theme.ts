import { TextStyle, ViewStyle } from "react-native";

export const theme = {
  colors: {
    primary: "#116530",
    primaryDark: "#0a4a1f",
    primaryLight: "#e8f5e9",
    secondary: "#ff6b35",
    secondaryLight: "#fff3f0",
    background: "#f8faf9",
    surface: "#ffffff",
    text: "#1a1a1a",
    textSecondary: "#666666",
    textLight: "#999999",
    border: "#e5e7eb",
    success: "#22c55e",
    successLight: "#dcfce7",
    warning: "#f59e0b",
    error: "#ef4444",
    errorLight: "#fee2e2",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: "900" as const,
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: "800" as const,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: "700" as const,
      lineHeight: 28,
    },
    body1: {
      fontSize: 16,
      fontWeight: "500" as const,
      lineHeight: 24,
    },
    body2: {
      fontSize: 14,
      fontWeight: "500" as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: "500" as const,
      lineHeight: 16,
    },
  },
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
  },
};
