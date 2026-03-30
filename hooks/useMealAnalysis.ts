import { useState, useCallback, useRef } from 'react';
import { AnalysisResult, AnalysisState, AnalysisErrorCode } from '../types';
import { compressImage, computeImageHash } from '../utils/imageUtils';
import { analysisService } from '../services/analysisService';
import { storageService } from '../services/storageService';

const RETRY_DELAYS = [1000, 2000];

interface MealAnalysisState {
  state: AnalysisState;
  result: AnalysisResult | null;
  photoUrl: string | null;
  photoUri: string | null;
  error: string | null;
  errorCode: AnalysisErrorCode | null;
  isLowConfidence: boolean;
  cached: boolean;
}

interface UseMealAnalysisReturn extends MealAnalysisState {
  analyze: (imageUri: string, portionNotes?: string) => Promise<void>;
  reset: () => void;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useMealAnalysis(): UseMealAnalysisReturn {
  const [state, setState] = useState<MealAnalysisState>({
    state: 'idle',
    result: null,
    photoUrl: null,
    photoUri: null,
    error: null,
    errorCode: null,
    isLowConfidence: false,
    cached: false,
  });

  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = true;
    setState({
      state: 'idle',
      result: null,
      photoUrl: null,
      photoUri: null,
      error: null,
      errorCode: null,
      isLowConfidence: false,
      cached: false,
    });
  }, []);

  const analyze = useCallback(async (imageUri: string, portionNotes?: string) => {
    abortRef.current = false;

    setState((prev) => ({ ...prev, state: 'compressing', error: null, errorCode: null }));

    // Step 1: Compress image
    let compressed: Awaited<ReturnType<typeof compressImage>>;
    try {
      compressed = await compressImage(imageUri);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        state: 'error',
        error: 'Failed to process image. Please try again.',
        errorCode: 'INVALID_IMAGE',
      }));
      return;
    }

    const imageHash = await computeImageHash(compressed.base64);

    setState((prev) => ({ ...prev, state: 'uploading', photoUri: compressed.uri }));

    // Step 2: Upload + analyse in parallel
    let photoUrl: string | null = null;
    let analysisResult: AnalysisResult | null = null;
    let cached = false;

    try {
      const [uploadResult, analysisResponse] = await Promise.allSettled([
        storageService.uploadPhoto(compressed.base64, imageHash, compressed.mimeType),
        (async () => {
          // With retry logic
          for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
            const response = await analysisService.analyzeImage({
              imageBase64: compressed.base64,
              imageMediaType: compressed.mimeType,
              portionNotes,
              imageHash,
            });

            if (response.success && response.data) {
              return response;
            }

            if (response.errorCode === 'RATE_LIMITED' && attempt < RETRY_DELAYS.length) {
              await delay(RETRY_DELAYS[attempt]);
              continue;
            }

            if (
              (response.errorCode === 'PARSE_ERROR' || response.errorCode === 'VALIDATION_ERROR') &&
              attempt === 0
            ) {
              await delay(500);
              continue;
            }

            throw Object.assign(new Error(response.error ?? 'Analysis failed'), {
              code: response.errorCode,
            });
          }
          throw new Error('Analysis failed after retries');
        })(),
      ]);

      if (abortRef.current) return;

      if (uploadResult.status === 'fulfilled') {
        photoUrl = uploadResult.value;
      } else {
        console.warn('Photo upload failed:', uploadResult.reason);
      }

      if (analysisResponse.status === 'rejected') {
        const err = analysisResponse.reason as Error & { code?: AnalysisErrorCode };
        setState((prev) => ({
          ...prev,
          state: 'error',
          error: getErrorMessage(err.code),
          errorCode: err.code ?? 'CLAUDE_ERROR',
        }));
        return;
      }

      const resp = analysisResponse.value;
      if (!resp?.success || !resp.data) {
        setState((prev) => ({
          ...prev,
          state: 'error',
          error: 'Could not analyse image. Please try again.',
          errorCode: 'CLAUDE_ERROR',
        }));
        return;
      }

      analysisResult = resp.data;
      cached = resp.cached ?? false;
    } catch (err) {
      if (abortRef.current) return;
      setState((prev) => ({
        ...prev,
        state: 'error',
        error: 'Analysis failed. Please check your connection and try again.',
        errorCode: 'CLAUDE_ERROR',
      }));
      return;
    }

    setState({
      state: 'success',
      result: analysisResult,
      photoUrl,
      photoUri: compressed.uri,
      error: null,
      errorCode: null,
      isLowConfidence: (analysisResult?.confidence ?? 1) < 0.5,
      cached,
    });
  }, []);

  return { ...state, analyze, reset };
}

function getErrorMessage(code?: AnalysisErrorCode): string {
  switch (code) {
    case 'RATE_LIMITED':
      return 'AI is busy, please try again in a moment.';
    case 'PARSE_ERROR':
    case 'VALIDATION_ERROR':
      return "Couldn't read AI response. Please retry.";
    case 'INVALID_IMAGE':
      return 'Invalid image. Please try a different photo.';
    default:
      return 'Analysis failed. Please try again.';
  }
}
