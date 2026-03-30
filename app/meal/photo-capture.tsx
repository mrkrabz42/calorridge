import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { MEAL_TYPE_ORDER, MEAL_TYPES } from '../../constants/mealTypes';
import { MealType } from '../../types';

// ---------------------------------------------------------------------------
// Web image compression via canvas
// ---------------------------------------------------------------------------
async function compressImageWeb(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1024;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Simple hash (avoids reliance on crypto.subtle availability)
// ---------------------------------------------------------------------------
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 10000); i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ---------------------------------------------------------------------------
// Guess meal type from current hour
// ---------------------------------------------------------------------------
function guessMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PhotoCaptureScreen() {
  const insets = useSafeAreaInsets();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>(guessMealType());
  const [notes, setNotes] = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // File selection handler
  // -----------------------------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input value so the same file can be re-selected
    e.target.value = '';

    setSelectedFile(file);
    setError(null);

    // Create a preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // -----------------------------------------------------------------------
  // Clear selection
  // -----------------------------------------------------------------------
  const clearPhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  // -----------------------------------------------------------------------
  // Analyse with AI
  // -----------------------------------------------------------------------
  const handleAnalyse = async () => {
    if (!selectedFile) return;

    setIsAnalysing(true);
    setError(null);

    try {
      const { base64, mimeType } = await compressImageWeb(selectedFile);
      const hash = simpleHash(base64);

      const { data, error: fnError } = await supabase.functions.invoke(
        'analyze-meal',
        {
          body: {
            imageBase64: base64,
            imageMediaType: mimeType,
            imageHash: hash,
            portionNotes: notes || undefined,
          },
        }
      );

      if (fnError) throw fnError;

      if (!data?.data) {
        throw new Error('No analysis data returned');
      }

      router.push({
        pathname: '/meal/confirm',
        params: {
          result: JSON.stringify(data.data),
          photoUri: previewUrl ?? '',
          mealType,
          notes,
        },
      });
    } catch (err: any) {
      console.error('[PhotoCapture] Analysis error:', err);
      setError(err?.message ?? 'Analysis failed. Please try again.');
    } finally {
      setIsAnalysing(false);
    }
  };

  // -----------------------------------------------------------------------
  // Navigate to manual entry
  // -----------------------------------------------------------------------
  const goManual = () => {
    router.push({
      pathname: '/meal/confirm',
      params: { manual: '1', mealType, notes },
    });
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Add Meal</Text>

        {/* Hidden file inputs (web only) */}
        {Platform.OS === 'web' && (
          <>
            <input
              ref={cameraInputRef as any}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileSelect as any}
            />
            <input
              ref={galleryInputRef as any}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect as any}
            />
          </>
        )}

        {/* ---- No photo selected ---- */}
        {!previewUrl && (
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.bigButton}
              activeOpacity={0.8}
              onPress={() => cameraInputRef.current?.click()}
            >
              <Text style={styles.bigButtonIcon}>CAM</Text>
              <Text style={styles.bigButtonLabel}>Take Photo</Text>
              <Text style={styles.bigButtonHint}>
                Opens your device camera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bigButton}
              activeOpacity={0.8}
              onPress={() => galleryInputRef.current?.click()}
            >
              <Text style={styles.bigButtonIcon}>IMG</Text>
              <Text style={styles.bigButtonLabel}>Choose from Gallery</Text>
              <Text style={styles.bigButtonHint}>
                Select an existing photo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---- Photo preview ---- */}
        {previewUrl && (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: previewUrl }}
              style={styles.preview}
              resizeMode="cover"
            />
            <TouchableOpacity onPress={clearPhoto} style={styles.changeLink}>
              <Text style={styles.changeLinkText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---- Meal type selector ---- */}
        <View style={styles.section}>
          <Text style={styles.label}>Meal Type</Text>
          <View style={styles.mealTypeRow}>
            {MEAL_TYPE_ORDER.map((type) => {
              const config = MEAL_TYPES[type];
              const isActive = mealType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mealTypeChip,
                    isActive && {
                      backgroundColor: config.color + '25',
                      borderColor: config.color,
                    },
                  ]}
                  onPress={() => setMealType(type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.mealTypeText,
                      isActive && { color: config.color },
                    ]}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ---- Notes ---- */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. large portion, no sauce"
            placeholderTextColor={Colors.text.muted}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* ---- Analyse button ---- */}
        {previewUrl && !isAnalysing && !error && (
          <TouchableOpacity
            style={styles.analyseButton}
            onPress={handleAnalyse}
            activeOpacity={0.85}
          >
            <Text style={styles.analyseButtonText}>Analyse with AI</Text>
          </TouchableOpacity>
        )}

        {/* ---- Loading state ---- */}
        {isAnalysing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.brand.primary} />
            <Text style={styles.loadingText}>Analysing your meal...</Text>
          </View>
        )}

        {/* ---- Error state ---- */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleAnalyse}
                activeOpacity={0.85}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.manualButton}
                onPress={goManual}
                activeOpacity={0.85}
              >
                <Text style={styles.manualButtonText}>Enter Manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ---- Manual entry shortcut (always visible) ---- */}
        {!isAnalysing && (
          <TouchableOpacity
            style={styles.manualLink}
            onPress={goManual}
            activeOpacity={0.7}
          >
            <Text style={styles.manualLinkText}>
              Skip photo and enter manually
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  heading: {
    color: Colors.text.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },

  // Big buttons
  buttonGroup: {
    gap: Spacing.md,
  },
  bigButton: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bigButtonIcon: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  bigButtonLabel: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  bigButtonHint: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },

  // Preview
  previewContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bg.secondary,
  },
  changeLink: {
    paddingVertical: Spacing.xs,
  },
  changeLinkText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Sections
  section: {
    gap: Spacing.sm,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Meal type
  mealTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  mealTypeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
  },
  mealTypeText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Notes
  notesInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Analyse button
  analyseButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  analyseButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
  },

  // Error
  errorContainer: {
    backgroundColor: Colors.status.error + '15',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.status.error + '40',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  manualButton: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  manualButtonText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Manual link
  manualLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  manualLinkText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    textDecorationLine: 'underline',
  },
});
