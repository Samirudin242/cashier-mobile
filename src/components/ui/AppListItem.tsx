import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, spacing, radius } from '../../config/theme';

interface Props {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: ViewStyle;
}

export function AppListItem({ title, subtitle, left, right, onPress, showChevron = false, style }: Props) {
  const content = (
    <View style={[styles.container, style]}>
      {left && <View style={styles.left}>{left}</View>}
      <View style={styles.content}>
        <AppText variant="bodyMedium">{title}</AppText>
        {subtitle && <AppText variant="caption" style={styles.subtitle}>{subtitle}</AppText>}
      </View>
      {right && <View style={styles.right}>{right}</View>}
      {showChevron && <ChevronRight size={18} color={colors.textMuted} />}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  left: {
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
  right: {
    marginLeft: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
