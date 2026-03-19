import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '../../config/theme';

interface Props {
  message?: string;
  fullScreen?: boolean;
}

export function AppLoader({ message, fullScreen = true }: Props) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <AppText variant="caption" style={styles.message}>{message}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fullScreen: {
    flex: 1,
  },
  message: {
    marginTop: spacing.md,
  },
});
