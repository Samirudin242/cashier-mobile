import React from 'react';
import { View, Modal, Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { X } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../config/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryAction?: { label: string; onPress: () => void; loading?: boolean };
  secondaryAction?: { label: string; onPress: () => void };
}

export function AppModal({ visible, onClose, title, children, primaryAction, secondaryAction }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <AppText variant="sectionTitle">{title}</AppText>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.body}>{children}</View>
          {(primaryAction || secondaryAction) && (
            <View style={styles.footer}>
              {secondaryAction && (
                <AppButton
                  title={secondaryAction.label}
                  onPress={secondaryAction.onPress}
                  variant="outline"
                  style={styles.footerButton}
                />
              )}
              {primaryAction && (
                <AppButton
                  title={primaryAction.label}
                  onPress={primaryAction.onPress}
                  loading={primaryAction.loading}
                  style={styles.footerButton}
                />
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  footerButton: {
    minWidth: 100,
  },
});
