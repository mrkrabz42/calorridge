import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase } from '../services/supabase';
import { profileManager } from '../services/profileManager';
import { chatService } from '../services/chatService';
import { challengeService } from '../services/challengeService';
import { useProfileStore } from '../store/profileStore';
import { Colors, Typography, Spacing, Radius } from '../constants';

export default function ProfilePhotoScreen() {
  const { profile, fetchProfile } = useProfileStore();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [goalDescription, setGoalDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPlan, setAiPlan] = useState<string | null>(null);
  const [parsedPlan, setParsedPlan] = useState<{
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null>(null);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);

  // Load existing data
  useEffect(() => {
    loadExisting();
  }, []);

  const loadExisting = async () => {
    const profileId = profileManager.getActiveProfileIdSync();
    if (!profileId) return;

    const { data } = await supabase
      .from('profiles')
      .select('photo_url, goal_description')
      .eq('id', profileId)
      .single();

    if (data) {
      const d = data as { photo_url: string | null; goal_description: string | null };
      if (d.photo_url) {
        setPhotoUrl(d.photo_url);
        setPhotoUri(d.photo_url);
      }
      if (d.goal_description) {
        setGoalDescription(d.goal_description);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhotoUri(asset.uri);
      setPhotoBase64(asset.base64 ?? null);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoBase64) return photoUrl;

    setIsUploading(true);
    try {
      const profileId = profileManager.getActiveProfileIdSync();
      const path = `profiles/${profileId}_${Date.now()}.jpg`;

      const binaryString = atob(photoBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(path, bytes.buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(path);

      const url = urlData.publicUrl;
      setPhotoUrl(url);

      // Save to profiles table
      await supabase
        .from('profiles')
        .update({ photo_url: url })
        .eq('id', profileId);

      return url;
    } catch (err) {
      Alert.alert('Error', 'Failed to upload photo.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const saveGoalDescription = async () => {
    const profileId = profileManager.getActiveProfileIdSync();
    await supabase
      .from('profiles')
      .update({ goal_description: goalDescription })
      .eq('id', profileId);
  };

  const handleGeneratePlan = async () => {
    if (!goalDescription.trim()) {
      Alert.alert('Missing Goal', 'Please describe your goal first.');
      return;
    }

    setIsGenerating(true);
    setAiPlan(null);
    setParsedPlan(null);

    try {
      // Upload photo if new
      const uploadedUrl = await uploadPhoto();

      // Save goal description
      await saveGoalDescription();

      // Build context for Claude
      const context: Record<string, unknown> = {
        userProfile: profile
          ? {
              weight_kg: profile.weight_kg,
              height_cm: profile.height_cm,
              age: profile.age,
              sex: profile.sex,
              activity_level: profile.activity_level,
              goal_type: profile.goal_type,
            }
          : null,
        goalDescription: goalDescription,
        hasPhoto: !!photoBase64 || !!uploadedUrl,
      };

      // Build the messages with image if available
      const userContent: string = photoBase64
        ? `[Photo attached]\n\nGoal: ${goalDescription}\n\nPlease analyse the photo and my profile data, then suggest a specific 30-day calorie and macro plan. Include exact daily calorie target, protein (g), carbs (g), and fat (g). At the end, on a new line, include: [PLAN_MACROS]{"calories":...,"protein_g":...,"carbs_g":...,"fat_g":...}[/PLAN_MACROS]`
        : `Goal: ${goalDescription}\n\nPlease analyse my profile data and suggest a specific 30-day calorie and macro plan. Include exact daily calorie target, protein (g), carbs (g), and fat (g). At the end, on a new line, include: [PLAN_MACROS]{"calories":...,"protein_g":...,"carbs_g":...,"fat_g":...}[/PLAN_MACROS]`;

      const messages = [{ role: 'user', content: userContent }];

      const response = await chatService.sendChat(
        messages,
        context,
        photoBase64 ?? undefined,
        photoBase64 ? 'image/jpeg' : undefined
      );

      let text = response.content;

      // Extract macros if present
      const macroMatch = text.match(/\[PLAN_MACROS\](.*?)\[\/PLAN_MACROS\]/s);
      if (macroMatch) {
        try {
          const macros = JSON.parse(macroMatch[1]);
          setParsedPlan(macros);
          text = text.replace(/\[PLAN_MACROS\].*?\[\/PLAN_MACROS\]/s, '').trim();
        } catch {
          // Ignore parse errors
        }
      }

      setAiPlan(text);
    } catch (err) {
      Alert.alert('Error', 'Failed to generate plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSetAsChallenge = async () => {
    if (!parsedPlan) return;

    setIsCreatingChallenge(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 29);

      await challengeService.createChallenge({
        name: 'AI Body Plan Challenge',
        goal_type: 'custom',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        duration_days: 30,
        target_calories: parsedPlan.calories,
        target_protein_g: parsedPlan.protein_g,
        target_carbs_g: parsedPlan.carbs_g,
        target_fat_g: parsedPlan.fat_g,
        start_weight_kg: profile?.weight_kg ?? undefined,
        notes: goalDescription,
      });

      Alert.alert(
        'Challenge Created',
        '30-day challenge has been set with the AI-recommended macros.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to create challenge.');
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Photo and Goals</Text>
      <Text style={styles.subtitle}>
        Upload a photo and describe your goal. The AI will create a personalised plan.
      </Text>

      {/* Photo section */}
      <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderIcon}>+</Text>
            <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {isUploading && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color={Colors.brand.primary} />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      {/* Goal description */}
      <Text style={styles.fieldLabel}>Your 30-Day Goal</Text>
      <TextInput
        style={styles.goalInput}
        value={goalDescription}
        onChangeText={setGoalDescription}
        placeholder="e.g. Lose body fat while maintaining muscle, get to 80kg..."
        placeholderTextColor={Colors.text.muted}
        multiline
        maxLength={500}
      />

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
        onPress={handleGeneratePlan}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <View style={styles.generatingRow}>
            <ActivityIndicator size="small" color={Colors.text.inverse} />
            <Text style={styles.generateBtnText}>Analysing...</Text>
          </View>
        ) : (
          <Text style={styles.generateBtnText}>Generate Plan</Text>
        )}
      </TouchableOpacity>

      {/* AI Plan result */}
      {aiPlan && (
        <View style={styles.planCard}>
          <Text style={styles.planTitle}>Your AI Plan</Text>
          <Text style={styles.planText}>{aiPlan}</Text>

          {parsedPlan && (
            <>
              <View style={styles.macroBanner}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: Colors.macro.calories }]}>
                    {parsedPlan.calories}
                  </Text>
                  <Text style={styles.macroLabel}>kcal</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: Colors.macro.protein }]}>
                    {parsedPlan.protein_g}g
                  </Text>
                  <Text style={styles.macroLabel}>protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: Colors.macro.carbs }]}>
                    {parsedPlan.carbs_g}g
                  </Text>
                  <Text style={styles.macroLabel}>carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: Colors.macro.fat }]}>
                    {parsedPlan.fat_g}g
                  </Text>
                  <Text style={styles.macroLabel}>fat</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.challengeBtn}
                onPress={handleSetAsChallenge}
                disabled={isCreatingChallenge}
              >
                <Text style={styles.challengeBtnText}>
                  {isCreatingChallenge ? 'Creating...' : 'Set as 30-Day Challenge'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md, gap: Spacing.md },

  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginTop: -Spacing.sm,
  },

  photoContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  photoPlaceholderIcon: {
    fontSize: 48,
    color: Colors.text.muted,
    fontWeight: Typography.weights.bold,
  },
  photoPlaceholderText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },

  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  uploadingText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },

  fieldLabel: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  goalInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },

  generateBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  planCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
    gap: Spacing.md,
  },
  planTitle: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  planText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
  },

  macroBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  macroItem: { alignItems: 'center', gap: 2 },
  macroValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  macroLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },

  challengeBtn: {
    backgroundColor: Colors.status.success,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  challengeBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
