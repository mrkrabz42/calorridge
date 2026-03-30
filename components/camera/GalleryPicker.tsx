import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors, Typography } from '../../constants';

interface Props {
  onPress: () => void;
}

export function GalleryPicker({ onPress }: Props) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.icon}>🖼️</Text>
      <Text style={styles.label}>Gallery</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    gap: 4,
  },
  icon: { fontSize: 28 },
  label: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
});
