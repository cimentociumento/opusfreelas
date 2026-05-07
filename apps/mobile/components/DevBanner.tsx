import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useDevelopmentMode } from '../hooks/use-development-mode';
import { theme } from './theme';

export function DevBanner() {
  const { isDevMode } = useDevelopmentMode();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (isDevMode) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isDevMode, fadeAnim]);

  if (!isDevMode) return null;

  return (
    <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerIcon}>🛠️</Text>
        <Text style={styles.bannerText}>MODO DESENVOLVIMENTO</Text>
        <Text style={styles.bannerSubtext}>Sem autenticação real • Dados Mock</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF6B35',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: '#E55A2B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerContent: {
    alignItems: 'center',
  },
  bannerIcon: {
    fontSize: 20,
    marginBottom: theme.spacing.xs,
  },
  bannerText: {
    ...theme.typography.body2,
    color: '#fff',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bannerSubtext: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginTop: 2,
  },
});
