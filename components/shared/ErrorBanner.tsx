import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants';

interface Props {
  message: string;
  onRetry?: () => void;
  type?: 'error' | 'warning';
}

export function ErrorBanner({ message, onRetry, type = 'error' }: Props) {
  const color = type === 'warning' ? Colors.status.warning : Colors.status.error;
  const bg = type === 'warning' ? 'rgba(250,204,21,0.1)' : 'rgba(248,113,113,0.1)';

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: color }]}>
      <Text style={[styles.message, { color }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
          <Text style={[styles.retryText, { color }]}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  retryBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  retryText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    textDecorationLine: 'underline',
  },
});
