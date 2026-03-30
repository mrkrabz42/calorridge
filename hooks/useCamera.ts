import { useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions } from 'expo-camera';

interface UseCameraReturn {
  hasPermission: boolean | null;
  requestPermission: () => Promise<void>;
  pickFromGallery: () => Promise<string | null>;
  isCameraReady: boolean;
  setCameraReady: (ready: boolean) => void;
}

export function useCamera(): UseCameraReturn {
  const [permission, requestCameraPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);

  const requestPermission = useCallback(async () => {
    if (permission?.status === 'denied') {
      Alert.alert(
        'Camera Permission Required',
        'CalorRidge needs camera access to photograph your meals. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    await requestCameraPermission();
  }, [permission, requestCameraPermission]);

  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Permission Required',
        'CalorRidge needs access to your photos to analyse meals from your gallery.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return result.assets[0].uri;
  }, []);

  return {
    hasPermission: permission?.granted ?? null,
    requestPermission,
    pickFromGallery,
    isCameraReady,
    setCameraReady: setIsCameraReady,
  };
}
