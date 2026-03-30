import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCamera } from '../../hooks/useCamera';
import { useMealAnalysis } from '../../hooks/useMealAnalysis';
import { CaptureButton } from '../../components/camera/CaptureButton';
import { GalleryPicker } from '../../components/camera/GalleryPicker';
import { NoteField } from '../../components/meal/NoteField';
import { MealTypeSelector } from '../../components/meal/MealTypeSelector';
import { LoadingOverlay } from '../../components/shared/LoadingOverlay';
import { Colors, Typography, Spacing } from '../../constants';
import { MealType } from '../../types';

const LOADING_MESSAGES: Record<string, string> = {
  compressing: 'Preparing image...',
  uploading: 'Uploading & analysing...',
  analysing: 'AI is reading your meal...',
};

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const { hasPermission, requestPermission, pickFromGallery, isCameraReady, setCameraReady } =
    useCamera();
  const { analyze, state, result, photoUrl, photoUri, error, errorCode, reset } =
    useMealAnalysis();

  const [notes, setNotes] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [showNotes, setShowNotes] = useState(false);

  const isLoading = state === 'compressing' || state === 'uploading' || state === 'analysing';

  // Navigate to confirm when analysis succeeds
  React.useEffect(() => {
    if (state === 'success' && result) {
      router.push({
        pathname: '/meal/confirm',
        params: {
          result: JSON.stringify(result),
          photoUrl: photoUrl ?? '',
          photoUri: photoUri ?? '',
          mealType,
          notes,
        },
      });
      reset();
    }
  }, [state, result]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !isCameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (photo?.uri) {
        await analyze(photo.uri, notes);
      }
    } catch (err) {
      Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
    }
  }, [isCameraReady, notes, analyze]);

  const handleGallery = useCallback(async () => {
    const uri = await pickFromGallery();
    if (uri) {
      await analyze(uri, notes);
    }
  }, [pickFromGallery, notes, analyze]);

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>Camera</Text>
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          CalorRidge needs camera access to photograph and analyse your meals.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Enable Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryFallback} onPress={handleGallery}>
          <Text style={styles.galleryFallbackText}>Or pick from Gallery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      >
        {/* Top overlay */}
        <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>Photograph your meal</Text>
          <TouchableOpacity
            style={styles.notesToggle}
            onPress={() => setShowNotes((p) => !p)}
          >
            <Text style={styles.notesToggleText}>N</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
          {showNotes && (
            <View style={styles.notesPanel}>
              <MealTypeSelector value={mealType} onChange={setMealType} />
              <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.sm }}>
                <NoteField value={notes} onChange={setNotes} />
              </View>
            </View>
          )}

          <View style={styles.controls}>
            <GalleryPicker onPress={handleGallery} />
            <CaptureButton onPress={handleCapture} disabled={!isCameraReady || isLoading} />
            <View style={{ width: 60 }} />
          </View>
        </View>
      </CameraView>

      {/* Error display */}
      {state === 'error' && error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={reset}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.manualBtn}
            onPress={() => {
              reset();
              router.push({
                pathname: '/meal/confirm',
                params: {
                  result: JSON.stringify(null),
                  photoUrl: '',
                  photoUri: '',
                  mealType,
                  notes,
                  manual: '1',
                },
              });
            }}
          >
            <Text style={styles.manualText}>Enter Manually</Text>
          </TouchableOpacity>
        </View>
      )}

      <LoadingOverlay
        visible={isLoading}
        message={LOADING_MESSAGES[state] ?? 'Loading...'}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  topOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cameraTitle: {
    flex: 1,
    color: '#fff',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  notesToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesToggleText: { fontSize: 18 },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: Spacing.md,
  },
  notesPanel: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  permissionIcon: { fontSize: 28, color: Colors.text.secondary, fontWeight: Typography.weights.bold },
  permissionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  permissionText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 24,
    marginTop: Spacing.sm,
  },
  permissionBtnText: {
    color: Colors.text.inverse,
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.base,
  },
  galleryFallback: { marginTop: Spacing.sm },
  galleryFallbackText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    textDecorationLine: 'underline',
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bg.secondary,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.brand.primary,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryText: {
    color: Colors.text.inverse,
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.base,
  },
  manualBtn: { alignItems: 'center' },
  manualText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    textDecorationLine: 'underline',
  },
});
