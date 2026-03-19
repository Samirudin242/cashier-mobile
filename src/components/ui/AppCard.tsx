import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, spacing, radius, shadows } from '../../config/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
}

export function AppCard({ children, style, onPress, padded = true }: Props) {
  const cardStyle = [styles.card, padded && styles.padded, style];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  padded: {
    padding: spacing.base,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
});
