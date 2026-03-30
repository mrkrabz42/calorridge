import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../../constants';
import { Challenge } from '../../../types/challenge';
import { challengeService } from '../../../services/challengeService';
import { useChallengeStore } from '../../../store/challengeStore';

export default function EditChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateChallenge } = useChallengeStore();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [targetProtein, setTargetProtein] = useState('');
  const [targetCarbs, setTargetCarbs] = useState('');
  const [targetFat, setTargetFat] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    challengeService.getChallengeById(id).then((c) => {
      if (!c) {
        setLoading(false);
        return;
      }
      setChallenge(c);
      setName(c.name);
      setTargetCalories(String(c.target_calories));
      setTargetProtein(String(Math.round(c.target_protein_g)));
      setTargetCarbs(String(Math.round(c.target_carbs_g)));
      setTargetFat(String(Math.round(c.target_fat_g)));
      setTargetWeight(c.target_weight_kg != null ? String(c.target_weight_kg) : '');
      setNotes(c.notes ?? '');
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!challenge || !id) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Validation', 'Challenge name is required.');
      return;
    }

    const calories = parseInt(targetCalories, 10);
    const protein = parseFloat(targetProtein);
    const carbs = parseFloat(targetCarbs);
    const fat = parseFloat(targetFat);

    if (isNaN(calories) || calories <= 0) {
      Alert.alert('Validation', 'Please enter a valid calorie target.');
      return;
    }
    if (isNaN(protein) || protein < 0) {
      Alert.alert('Validation', 'Please enter a valid protein target.');
      return;
    }
    if (isNaN(carbs) || carbs < 0) {
      Alert.alert('Validation', 'Please enter a valid carbs target.');
      return;
    }
    if (isNaN(fat) || fat < 0) {
      Alert.alert('Validation', 'Please enter a valid fat target.');
      return;
    }

    const weight = targetWeight.trim() ? parseFloat(targetWeight) : undefined;
    if (targetWeight.trim() && (isNaN(weight!) || weight! <= 0)) {
      Alert.alert('Validation', 'Please enter a valid target weight or leave it blank.');
      return;
    }

    setSaving(true);
    try {
      await updateChallenge(id, {
        name: trimmedName,
        target_calories: calories,
        target_protein_g: protein,
        target_carbs_g: carbs,
        target_fat_g: fat,
        target_weight_kg: weight,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={Colors.brand.primary} size="large" />
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.emptyText}>Challenge not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Challenge Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Summer Cut"
            placeholderTextColor={Colors.text.muted}
            maxLength={60}
          />
        </View>

        {/* Target Calories */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Target Calories (kcal)</Text>
          <TextInput
            style={styles.input}
            value={targetCalories}
            onChangeText={setTargetCalories}
            placeholder="2000"
            placeholderTextColor={Colors.text.muted}
            keyboardType="number-pad"
          />
        </View>

        {/* Macros row */}
        <Text style={styles.sectionTitle}>Macro Targets</Text>
        <View style={styles.macroRow}>
          <View style={styles.macroField}>
            <Text style={styles.label}>Protein (g)</Text>
            <TextInput
              style={styles.input}
              value={targetProtein}
              onChangeText={setTargetProtein}
              placeholder="150"
              placeholderTextColor={Colors.text.muted}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.macroField}>
            <Text style={styles.label}>Carbs (g)</Text>
            <TextInput
              style={styles.input}
              value={targetCarbs}
              onChangeText={setTargetCarbs}
              placeholder="200"
              placeholderTextColor={Colors.text.muted}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.macroField}>
            <Text style={styles.label}>Fat (g)</Text>
            <TextInput
              style={styles.input}
              value={targetFat}
              onChangeText={setTargetFat}
              placeholder="60"
              placeholderTextColor={Colors.text.muted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Target Weight */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Target Weight (kg) - optional</Text>
          <TextInput
            style={styles.input}
            value={targetWeight}
            onChangeText={setTargetWeight}
            placeholder="75"
            placeholderTextColor={Colors.text.muted}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            placeholderTextColor={Colors.text.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color={Colors.bg.primary} size="small" />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  center: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.text.secondary, fontSize: Typography.sizes.base },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginTop: Spacing.xs,
  },
  fieldGroup: { gap: Spacing.xs },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  input: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  macroField: {
    flex: 1,
    gap: Spacing.xs,
  },
  saveBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: Colors.bg.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
