import React from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDevelopmentMode } from "../hooks/use-development-mode";
import { theme } from "./theme";

export function DevModeToggle() {
  const { isDevMode, toggleDevMode } = useDevelopmentMode();
  const [scaleAnim] = React.useState(new Animated.Value(1));

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 100, useNativeDriver: true }),
    ]).start();
    toggleDevMode();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toggle, isDevMode && styles.toggleActive]}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.toggleButton, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.toggleCircle, isDevMode && styles.toggleCircleActive]} />
        </Animated.View>
      </TouchableOpacity>
      <Text style={[styles.label, isDevMode && styles.labelActive]}>
        {isDevMode ? "🛠️ DEV" : "📱 PROD"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggle: {
    width: 40,
    height: 24,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleButton: {
    width: "100%",
    alignItems: "flex-start",
  },
  toggleCircle: {
    width: 18,
    height: 18,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleCircleActive: {
    backgroundColor: "#fff",
    borderColor: theme.colors.primary,
    transform: [{ translateX: 14 }],
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    minWidth: 60,
    textAlign: "center",
  },
  labelActive: {
    color: theme.colors.primary,
  },
});
