import React, { useRef } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants';

interface Props {
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}

export function CaptureButton({ onPress, disabled = false, size = 72 }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = async () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.outer, { width: size + 16, height: size + 16, borderRadius: (size + 16) / 2 }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        <View style={[styles.inner, { width: size, height: size, borderRadius: size / 2 }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  inner: {
    backgroundColor: '#fff',
  },
});
