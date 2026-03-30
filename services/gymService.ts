import { supabase } from './supabase';
import { profileManager } from './profileManager';
import {
  GymExercise,
  WorkoutSession,
  WorkoutExercise,
  ExerciseSet,
  PersonalRecord,
  WorkoutTemplate,
  TemplateExercise,
  CreateSetInput,
  UpdateSetInput,
  SessionExerciseWithSets,
} from '../types/gym';
import { estimateE1RM } from '../utils/strengthUtils';

export const gymService = {
  // ============================================================
  // EXERCISE LIBRARY
  // ============================================================

  async getExerciseLibrary(category?: string, search?: string): Promise<GymExercise[]> {
    let query = supabase
      .from('exercise_library')
      .select('*')
      .order('category')
      .order('name');

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (search?.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch exercises: ${error.message}`);
    return (data ?? []) as GymExercise[];
  },

  async getExerciseById(id: string): Promise<GymExercise | null> {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch exercise: ${error.message}`);
    }
    return data as GymExercise;
  },

  async createCustomExercise(exercise: Partial<GymExercise>): Promise<GymExercise> {
    const { data, error } = await supabase
      .from('exercise_library')
      .insert({ ...exercise, is_custom: true })
      .select()
      .single();

    if (error) throw new Error(`Failed to create exercise: ${error.message}`);
    return data as GymExercise;
  },

  // ============================================================
  // WORKOUT SESSIONS
  // ============================================================

  async createSession(name?: string, templateId?: string): Promise<WorkoutSession> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        profile_id: profileId,
        name: name || null,
        template_id: templateId || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create session: ${error.message}`);
    return data as WorkoutSession;
  },

  async getActiveSession(): Promise<WorkoutSession | null> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch active session: ${error.message}`);
    }
    return data as WorkoutSession;
  },

  async getSessionById(id: string): Promise<WorkoutSession | null> {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch session: ${error.message}`);
    }
    return data as WorkoutSession;
  },

  async getSessionsByDate(date: string): Promise<WorkoutSession[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('profile_id', profileId)
      .eq('session_date', date)
      .eq('status', 'completed')
      .order('started_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
    return (data ?? []) as WorkoutSession[];
  },

  async getRecentSessions(limit = 20): Promise<WorkoutSession[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'completed')
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
    return (data ?? []) as WorkoutSession[];
  },

  async finishSession(sessionId: string, totalVolume: number, totalSets: number, caloriesBurned: number): Promise<WorkoutSession> {
    const session = await gymService.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');

    const now = new Date().toISOString();
    const startedAt = new Date(session.started_at).getTime();
    const durationSecs = Math.round((Date.now() - startedAt) / 1000);

    const { data, error } = await supabase
      .from('workout_sessions')
      .update({
        status: 'completed',
        finished_at: now,
        duration_secs: durationSecs,
        total_volume_kg: totalVolume,
        total_sets: totalSets,
        calories_burned: caloriesBurned,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw new Error(`Failed to finish session: ${error.message}`);
    return data as WorkoutSession;
  },

  async cancelSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('workout_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId);

    if (error) throw new Error(`Failed to cancel session: ${error.message}`);
  },

  // ============================================================
  // WORKOUT EXERCISES (within a session)
  // ============================================================

  async getSessionExercisesWithSets(sessionId: string): Promise<SessionExerciseWithSets[]> {
    // Get workout exercises
    const { data: weData, error: weError } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('session_id', sessionId)
      .order('position');

    if (weError) throw new Error(`Failed to fetch exercises: ${weError.message}`);
    const workoutExercises = (weData ?? []) as WorkoutExercise[];

    if (workoutExercises.length === 0) return [];

    // Get exercise details
    const exerciseIds = [...new Set(workoutExercises.map((we) => we.exercise_id))];
    const { data: exData } = await supabase
      .from('exercise_library')
      .select('*')
      .in('id', exerciseIds);
    const exercises = (exData ?? []) as GymExercise[];
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    // Get all sets
    const weIds = workoutExercises.map((we) => we.id);
    const { data: setsData } = await supabase
      .from('exercise_sets')
      .select('*')
      .in('workout_exercise_id', weIds)
      .order('set_number');
    const allSets = (setsData ?? []) as ExerciseSet[];

    // Build composite objects
    return workoutExercises.map((we) => ({
      ...we,
      exercise: exerciseMap.get(we.exercise_id)!,
      sets: allSets.filter((s) => s.workout_exercise_id === we.id),
      previousSets: null, // loaded separately when needed
    }));
  },

  async addExerciseToSession(sessionId: string, exerciseId: string): Promise<WorkoutExercise> {
    // Get current max position
    const { data: existing } = await supabase
      .from('workout_exercises')
      .select('position')
      .eq('session_id', sessionId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existing?.length ? (existing[0] as { position: number }).position + 1 : 1;

    const { data, error } = await supabase
      .from('workout_exercises')
      .insert({
        session_id: sessionId,
        exercise_id: exerciseId,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add exercise: ${error.message}`);
    return data as WorkoutExercise;
  },

  async removeExerciseFromSession(workoutExerciseId: string): Promise<void> {
    const { error } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('id', workoutExerciseId);

    if (error) throw new Error(`Failed to remove exercise: ${error.message}`);
  },

  async updateExerciseRestTime(workoutExerciseId: string, restSecs: number): Promise<void> {
    const { error } = await supabase
      .from('workout_exercises')
      .update({ rest_secs: restSecs })
      .eq('id', workoutExerciseId);

    if (error) throw new Error(`Failed to update rest time: ${error.message}`);
  },

  // ============================================================
  // SETS
  // ============================================================

  async addSet(input: CreateSetInput): Promise<ExerciseSet> {
    const { data, error } = await supabase
      .from('exercise_sets')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to add set: ${error.message}`);
    return data as ExerciseSet;
  },

  async updateSet(setId: string, input: UpdateSetInput): Promise<ExerciseSet> {
    const { data, error } = await supabase
      .from('exercise_sets')
      .update(input)
      .eq('id', setId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update set: ${error.message}`);
    return data as ExerciseSet;
  },

  async deleteSet(setId: string): Promise<void> {
    const { error } = await supabase
      .from('exercise_sets')
      .delete()
      .eq('id', setId);

    if (error) throw new Error(`Failed to delete set: ${error.message}`);
  },

  async completeSet(setId: string): Promise<ExerciseSet> {
    const { data, error } = await supabase
      .from('exercise_sets')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', setId)
      .select()
      .single();

    if (error) throw new Error(`Failed to complete set: ${error.message}`);
    return data as ExerciseSet;
  },

  // ============================================================
  // PERSONAL RECORDS
  // ============================================================

  async getPersonalRecords(exerciseId: string): Promise<PersonalRecord[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('profile_id', profileId)
      .eq('exercise_id', exerciseId)
      .order('achieved_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch PRs: ${error.message}`);
    return (data ?? []) as PersonalRecord[];
  },

  async checkAndUpdatePR(
    exerciseId: string,
    weight: number,
    reps: number,
    sessionId: string
  ): Promise<{ isPR: boolean; prTypes: string[] }> {
    const profileId = profileManager.getActiveProfileIdSync();
    const prTypes: string[] = [];

    // Check weight PR
    const { data: weightPR } = await supabase
      .from('personal_records')
      .select('value')
      .eq('profile_id', profileId)
      .eq('exercise_id', exerciseId)
      .eq('pr_type', 'weight')
      .order('value', { ascending: false })
      .limit(1);

    if (!weightPR?.length || weight > (weightPR[0] as { value: number }).value) {
      await supabase.from('personal_records').insert({
        profile_id: profileId,
        exercise_id: exerciseId,
        pr_type: 'weight',
        value: weight,
        weight_kg: weight,
        reps,
        session_id: sessionId,
      });
      prTypes.push('weight');
    }

    // Check estimated 1RM PR
    const e1rm = estimateE1RM(weight, reps);
    const { data: e1rmPR } = await supabase
      .from('personal_records')
      .select('value')
      .eq('profile_id', profileId)
      .eq('exercise_id', exerciseId)
      .eq('pr_type', 'estimated_1rm')
      .order('value', { ascending: false })
      .limit(1);

    if (!e1rmPR?.length || e1rm > (e1rmPR[0] as { value: number }).value) {
      await supabase.from('personal_records').insert({
        profile_id: profileId,
        exercise_id: exerciseId,
        pr_type: 'estimated_1rm',
        value: e1rm,
        weight_kg: weight,
        reps,
        session_id: sessionId,
      });
      prTypes.push('estimated_1rm');
    }

    // Check volume PR (single set)
    const volume = weight * reps;
    const { data: volPR } = await supabase
      .from('personal_records')
      .select('value')
      .eq('profile_id', profileId)
      .eq('exercise_id', exerciseId)
      .eq('pr_type', 'volume')
      .order('value', { ascending: false })
      .limit(1);

    if (!volPR?.length || volume > (volPR[0] as { value: number }).value) {
      await supabase.from('personal_records').insert({
        profile_id: profileId,
        exercise_id: exerciseId,
        pr_type: 'volume',
        value: volume,
        weight_kg: weight,
        reps,
        session_id: sessionId,
      });
      prTypes.push('volume');
    }

    return { isPR: prTypes.length > 0, prTypes };
  },

  // ============================================================
  // EXERCISE HISTORY (for inline "previous" display)
  // ============================================================

  async getExerciseHistory(exerciseId: string, limit = 1): Promise<ExerciseSet[][]> {
    const profileId = profileManager.getActiveProfileIdSync();

    // Get last N completed sessions
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('profile_id', profileId)
      .eq('status', 'completed')
      .order('session_date', { ascending: false })
      .limit(20);

    if (!sessions?.length) return [];

    const sessionIds = sessions.map((s: any) => s.id);

    // Get workout_exercises for this exercise in those sessions
    const { data: weData } = await supabase
      .from('workout_exercises')
      .select('id, session_id')
      .eq('exercise_id', exerciseId)
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!weData?.length) return [];

    const weIds = weData.map((we: any) => we.id);

    // Get completed sets for those workout exercises
    const { data: setsData } = await supabase
      .from('exercise_sets')
      .select('*')
      .in('workout_exercise_id', weIds)
      .eq('is_completed', true)
      .order('set_number');

    const sets = (setsData ?? []) as ExerciseSet[];

    // Group by workout_exercise_id
    return weIds.map((weId: string) =>
      sets.filter((s) => s.workout_exercise_id === weId)
    );
  },

  // ============================================================
  // TEMPLATES
  // ============================================================

  async getTemplates(): Promise<WorkoutTemplate[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch templates: ${error.message}`);
    return (data ?? []) as WorkoutTemplate[];
  },

  async getTemplateExercises(templateId: string): Promise<(TemplateExercise & { exercise: GymExercise })[]> {
    const { data: teData, error } = await supabase
      .from('template_exercises')
      .select('*')
      .eq('template_id', templateId)
      .order('position');

    if (error) throw new Error(`Failed to fetch template exercises: ${error.message}`);
    const templateExercises = (teData ?? []) as TemplateExercise[];

    if (templateExercises.length === 0) return [];

    const exerciseIds = [...new Set(templateExercises.map((te) => te.exercise_id))];
    const { data: exData } = await supabase
      .from('exercise_library')
      .select('*')
      .in('id', exerciseIds);
    const exercises = (exData ?? []) as GymExercise[];
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    return templateExercises.map((te) => ({
      ...te,
      exercise: exerciseMap.get(te.exercise_id)!,
    }));
  },

  async createTemplate(name: string, description?: string, category?: string): Promise<WorkoutTemplate> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('workout_templates')
      .insert({ name, description, category, profile_id: profileId })
      .select()
      .single();

    if (error) throw new Error(`Failed to create template: ${error.message}`);
    return data as WorkoutTemplate;
  },

  async saveSessionAsTemplate(sessionId: string, name: string): Promise<WorkoutTemplate> {
    // Get session exercises
    const exercisesWithSets = await gymService.getSessionExercisesWithSets(sessionId);

    // Create template
    const template = await gymService.createTemplate(name);

    // Create template exercises from session
    const templateExercises = exercisesWithSets.map((we) => ({
      template_id: template.id,
      exercise_id: we.exercise_id,
      position: we.position,
      superset_group: we.superset_group,
      target_sets: we.sets.length || 3,
      target_reps_min: 8,
      target_reps_max: 12,
      rest_secs: we.rest_secs,
    }));

    const { error } = await supabase
      .from('template_exercises')
      .insert(templateExercises);

    if (error) throw new Error(`Failed to save template exercises: ${error.message}`);

    return template;
  },

  async createSessionFromTemplate(templateId: string): Promise<WorkoutSession> {
    const template = await supabase
      .from('workout_templates')
      .select('name')
      .eq('id', templateId)
      .single();

    const session = await gymService.createSession(
      (template.data as { name: string })?.name,
      templateId
    );

    // Get template exercises
    const { data: teData } = await supabase
      .from('template_exercises')
      .select('*')
      .eq('template_id', templateId)
      .order('position');

    const templateExercises = (teData ?? []) as TemplateExercise[];

    // Create workout exercises and pre-populate sets
    for (const te of templateExercises) {
      const we = await gymService.addExerciseToSession(session.id, te.exercise_id);

      // Update rest time
      if (te.rest_secs !== 90) {
        await gymService.updateExerciseRestTime(we.id, te.rest_secs);
      }

      // Pre-create empty sets based on template
      for (let i = 1; i <= te.target_sets; i++) {
        await gymService.addSet({
          workout_exercise_id: we.id,
          set_number: i,
          set_type: 'normal',
        });
      }
    }

    return session;
  },

  async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw new Error(`Failed to delete template: ${error.message}`);
  },

  // ============================================================
  // DAILY BURN (for dashboard integration)
  // ============================================================

  async getTodayCaloriesBurned(date: string): Promise<number> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('calories_burned')
      .eq('profile_id', profileId)
      .eq('session_date', date)
      .eq('status', 'completed');

    if (error) return 0;
    return (data ?? []).reduce((sum, s) => sum + ((s as { calories_burned: number | null }).calories_burned ?? 0), 0);
  },
};
