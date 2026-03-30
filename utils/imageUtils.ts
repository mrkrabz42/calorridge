import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { MAX_IMAGE_SIZE_BYTES, IMAGE_COMPRESSION_QUALITY } from '../constants';

// Polyfill for TextEncoder if not available
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function compressImage(uri: string): Promise<{
  base64: string;
  uri: string;
  size: number;
  mimeType: string;
}> {
  let quality = IMAGE_COMPRESSION_QUALITY;
  let result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  // Iteratively compress if still too large
  while (result.base64 && result.base64.length * 0.75 > MAX_IMAGE_SIZE_BYTES && quality > 0.3) {
    quality -= 0.1;
    result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
  }

  const base64 = result.base64 ?? '';
  const size = Math.round(base64.length * 0.75);

  return {
    base64,
    uri: result.uri,
    size,
    mimeType: 'image/jpeg',
  };
}

export async function computeImageHash(base64: string): Promise<string> {
  // Use the Web Crypto API available in React Native's Hermes engine
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(base64);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple hash using charCode sum (not cryptographic, but avoids crashes)
    let hash = 0;
    for (let i = 0; i < Math.min(base64.length, 10000); i++) {
      const char = base64.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
