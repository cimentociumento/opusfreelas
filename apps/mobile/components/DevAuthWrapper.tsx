import React from 'react';
import { SignedIn, SignedOut } from '@clerk/clerk-expo';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useDevelopmentMode } from '../hooks/use-development-mode';
import { theme } from './theme';

interface DevAuthWrapperProps {
  signedInComponent: React.ReactNode;
  signedOutComponent: React.ReactNode;
}

export function DevAuthWrapper({ signedInComponent, signedOutComponent }: DevAuthWrapperProps) {
  const { isDevMode, isLoading } = useDevelopmentMode();

  // Enquanto carrega o estado do modo DEV, mostra loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  console.log(`🛠️ DevAuthWrapper: isDevMode = ${isDevMode}`);

  if (isDevMode) {
    // No modo DEV, sempre mostra o componente de logado
    console.log('🛠️ DEV MODE: Mostrando componente como se estivesse logado');
    return <>{signedInComponent}</>;
  }

  // No modo PROD, usa as verificações reais do Clerk
  console.log('📱 PROD MODE: Usando verificações reais do Clerk');
  return (
    <>
      <SignedIn>{signedInComponent}</SignedIn>
      <SignedOut>{signedOutComponent}</SignedOut>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
});
