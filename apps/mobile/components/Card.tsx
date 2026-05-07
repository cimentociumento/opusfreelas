import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { theme } from "./theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "outlined" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, style, variant = "default", padding = "md" }: CardProps) {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
    };

    const paddingStyle = {
      none: {},
      sm: { padding: theme.spacing.sm },
      md: { padding: theme.spacing.md },
      lg: { padding: theme.spacing.lg },
    };

    switch (variant) {
      case "default":
        return {
          ...baseStyle,
          ...paddingStyle[padding],
        };
      case "outlined":
        return {
          ...baseStyle,
          ...paddingStyle[padding],
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case "elevated":
        return {
          ...baseStyle,
          ...paddingStyle[padding],
          ...theme.shadows.md,
        };
      default:
        return baseStyle;
    }
  };

  return <View style={[getCardStyle(), style]}>{children}</View>;
}
