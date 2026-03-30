import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing } from '../../constants';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.destructiveBtn]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmText, destructive && styles.destructiveText]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  dialog: {
    backgroundColor: Colors.bg.card,
    borderRadius: 20,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  message: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.bg.secondary,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
  },
  destructiveBtn: {
    backgroundColor: Colors.status.error,
  },
  cancelText: {
    color: Colors.text.primary,
    fontWeight: Typography.weights.medium,
    fontSize: Typography.sizes.base,
  },
  confirmText: {
    color: Colors.text.inverse,
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.base,
  },
  destructiveText: {
    color: '#fff',
  },
});
