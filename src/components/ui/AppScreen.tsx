import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../config/theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function AppScreen({ children, scroll = true, style, padded = true, refreshing, onRefresh }: Props) {
  const content = (
    <View style={[styles.inner, padded && styles.padded, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.base,
  },
});
