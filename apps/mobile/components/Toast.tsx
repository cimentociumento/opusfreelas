import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Animated, Platform } from "react-native";
import { theme } from "./theme";

interface ToastMessage {
  id: string;
  text: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

interface ToastContextType {
  showToast: (text: string, type?: ToastMessage["type"], duration?: number) => void;
}

export const ToastContext = React.createContext<ToastContextType | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: ToastMessage["type"] = "info", duration: number = 3000) => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { id, text, type, duration };
    
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container}>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(Math.max(toast.duration || 3000, 1000) - 200),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove();
    });
  }, [fadeAnim, toast.duration]);

  const backgroundColor = getBackgroundColor(toast.type);
  const textColor = getTextColor(toast.type);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor,
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{toast.text}</Text>
    </Animated.View>
  );
}

function getBackgroundColor(type: ToastMessage["type"]): string {
  switch (type) {
    case "success":
      return "#4CAF50";
    case "error":
      return theme.colors.error || "#F44336";
    case "warning":
      return "#FF9800";
    case "info":
    default:
      return theme.colors.primary || "#2196F3";
  }
}

function getTextColor(type: ToastMessage["type"]): string {
  return "#fff";
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "web" ? 60 : 80,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
    zIndex: 9999,
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    maxWidth: "90%",
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
