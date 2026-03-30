import { supabase } from './supabase';
import { AnalysisRequest, AnalysisResponse } from '../types';

export const analysisService = {
  async analyzeImage(request: AnalysisRequest): Promise<AnalysisResponse> {
    const { data, error } = await supabase.functions.invoke('analyze-meal', {
      body: request,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'CLAUDE_ERROR',
      };
    }

    return data as AnalysisResponse;
  },
};
