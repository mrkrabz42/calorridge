import { supabase } from './supabase';

const BUCKET = 'meal-photos';

export const storageService = {
  async uploadPhoto(base64: string, hash: string, mimeType = 'image/jpeg'): Promise<string> {
    const path = `meals/${hash}.jpg`;

    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes.buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) throw new Error(`Failed to upload photo: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  async deletePhoto(photoUrl: string): Promise<void> {
    // Extract path from URL
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${BUCKET}/`);
    if (pathParts.length < 2) return;
    const path = pathParts[1];

    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.warn(`Failed to delete photo: ${error.message}`);
  },
};
