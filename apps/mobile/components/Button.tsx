import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { theme } from "./theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      ...theme.shadows.sm,
    };

    switch (variant) {
      case "primary":
        return {
          ...baseStyle,
          backgroundColor: disabled ? theme.colors.textLight : theme.colors.primary,
        };
      case "secondary":
        return {
          ...baseStyle,
          backgroundColor: disabled ? theme.colors.border : theme.colors.secondary,
        };
      case "outline":
        return {
          ...baseStyle,
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: disabled ? theme.colors.border : theme.colors.primary,
        };
      case "ghost":
        return {
          ...baseStyle,
          backgroundColor: "transparent",
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: "700",
    };

    switch (variant) {
      case "primary":
      case "secondary":
        return {
          ...baseTextStyle,
          color: "#fff",
        };
      case "outline":
      case "ghost":
        return {
          ...baseTextStyle,
          color: disabled ? theme.colors.textLight : theme.colors.primary,
        };
      default:
        return baseTextStyle;
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case "sm":
        return { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm };
      case "md":
        return { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md };
      case "lg":
        return { paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg };
      default:
        return {};
    }
  };

  const getTextSizeStyle = (): TextStyle => {
    switch (size) {
      case "sm":
        return { fontSize: 14 };
      case "md":
        return { fontSize: 16 };
      case "lg":
        return { fontSize: 18 };
      default:
        return { fontSize: 16 };
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), getSizeStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {icon && <View style={{ marginRight: theme.spacing.sm }}>{icon}</View>}
          <Text style={[getTextStyle(), getTextSizeStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
