import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';

interface CompleteDiaryButtonProps {
  onComplete: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function CompleteDiaryButton({
  onComplete,
  disabled = false,
  loading = false,
}: CompleteDiaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onComplete}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={Colors.text.inverse} size="small" />
      ) : (
        <Text style={[styles.text, disabled && styles.textDisabled]}>
          Complete Diary
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4ADE80',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    backgroundColor: Colors.text.muted,
    opacity: 0.5,
  },
  text: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  textDisabled: {
    color: Colors.text.secondary,
  },
});
