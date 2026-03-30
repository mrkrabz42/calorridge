import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Typography } from '../../constants';

interface Props {
  message?: string;
  visible: boolean;
}

export function LoadingOverlay({ message = 'Loading...', visible }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    minWidth: 180,
  },
  text: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
});
