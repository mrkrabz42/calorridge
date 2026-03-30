import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants';

interface Props {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export function NoteField({
  value,
  onChange,
  placeholder = 'e.g. "Half portion, large plate, about 2 cups"',
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Portion notes (optional)</Text>
      <Text style={styles.hint}>
        Help the AI estimate portions more accurately
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.muted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        returnKeyType="done"
        blurOnSubmit
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  hint: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  input: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    minHeight: 90,
    marginTop: 4,
  },
});
