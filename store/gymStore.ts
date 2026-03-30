import { create } from 'zustand';
import {
  GymExercise,
  WorkoutSession,
  SessionExerciseWithSets,
  ExerciseSet,
  WorkoutTemplate,
  GymExerciseCategory,
} from '../types/gym';
import { gymService } from '../services/gymService';
import { totalVolume, estimateSessionCalories } from '../utils/strengthUtils';

interface RestTimer {
  isRunning: boolean;
  remaining: number;
  total: number;
  intervalId?: ReturnType<typeof setInterval>;
}

interface GymState {
  // Active session
  activeSession: WorkoutSession | null;
  sessionExercises: SessionExerciseWithSets[];
  isSessionLoading: boolean;

  // Exercise library
  exerciseLibrary: GymExercise[];
  isLibraryLoading: boolean;

  // Rest timer
  restTimer: RestTimer | null;

  // Templates
  templates: WorkoutTemplate[];

  // Recent sessions
  recentSessions: WorkoutSession[];

  // Error
  error: string | null;

  // Session actions
  checkForActiveSession: () => Promise<void>;
  startSession: (name?: string, templateId?: string) => Promise<void>;
  finishSession: (userWeightKg?: number | null) => Promise<WorkoutSession>;
  cancelSession: () => Promise<void>;
  refreshSessionExercises: () => Promise<void>;

  // Exercise actions
  addExercise: (exerciseId: string) => Promise<void>;
  removeExercise: (workoutExerciseId: string) => Promise<void>;

  // Set actions
  addSet: (workoutExerciseId: string) => Promise<void>;
  updateSet: (setId: string, data: Partial<Pick<ExerciseSet, 'weight_kg' | 'reps' | 'rpe' | 'set_type'>>) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  completeSet: (setId: string, exerciseId: string) => Promise<{ isPR: boolean; prTypes: string[] }>;

  // Rest timer
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;

  // Library
  fetchExerciseLibrary: (category?: string, search?: string) => Promise<void>;

  // Templates
  fetchTemplates: () => Promise<void>;
  saveSessionAsTemplate: (name: string) => Promise<void>;
  startFromTemplate: (templateId: string) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;

  // History
  fetchRecentSessions: () => Promise<void>;

  // Utility
  clearError: () => void;
}

export const useGymStore = create<GymState>()((set, get) => ({
  activeSession: null,
  sessionExercises: [],
  isSessionLoading: false,
  exerciseLibrary: [],
  isLibraryLoading: false,
  restTimer: null,
  templates: [],
  recentSessions: [],
  error: null,

  checkForActiveSession: async () => {
    try {
      const session = await gymService.getActiveSession();
      if (session) {
        set({ activeSession: session });
        const exercises = await gymService.getSessionExercisesWithSets(session.id);

        // Load previous session data for each exercise
        const withHistory = await Promise.all(
          exercises.map(async (we) => {
            try {
              const history = await gymService.getExerciseHistory(we.exercise_id, 1);
              return { ...we, previousSets: history.length > 0 ? history : null };
            } catch {
              return { ...we, previousSets: null };
            }
          })
        );

        set({ sessionExercises: withHistory });
      }
    } catch {
      // Silent — no active session
    }
  },

  startSession: async (name?: string, templateId?: string) => {
    set({ isSessionLoading: true, error: null });
    try {
      let session: WorkoutSession;
      if (templateId) {
        session = await gymService.createSessionFromTemplate(templateId);
      } else {
        session = await gymService.createSession(name);
      }
      const exercises = await gymService.getSessionExercisesWithSets(session.id);

      // Load previous session data for each exercise
      const withHistory = await Promise.all(
        exercises.map(async (we) => {
          try {
            const history = await gymService.getExerciseHistory(we.exercise_id, 1);
            return { ...we, previousSets: history.length > 0 ? history : null };
          } catch {
            return { ...we, previousSets: null };
          }
        })
      );

      set({ activeSession: session, sessionExercises: withHistory, isSessionLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isSessionLoading: false });
    }
  },

  finishSession: async (userWeightKg?: number | null) => {
    const { activeSession, sessionExercises } = get();
    if (!activeSession) throw new Error('No active session');

    // Calculate totals
    const allSets = sessionExercises.flatMap((we) => we.sets);
    const completedSets = allSets.filter((s) => s.is_completed);
    const volume = totalVolume(completedSets);
    const durationSecs = Math.round(
      (Date.now() - new Date(activeSession.started_at).getTime()) / 1000
    );

    // Estimate calories
    const mets = sessionExercises
      .map((we) => we.exercise?.met_value)
      .filter((m): m is number => m !== null && m !== undefined);
    const avgMet = mets.length > 0 ? mets.reduce((a, b) => a + b, 0) / mets.length : null;
    const calories = estimateSessionCalories(durationSecs, avgMet, userWeightKg ?? null);

    const finished = await gymService.finishSession(
      activeSession.id,
      Math.round(volume * 100) / 100,
      completedSets.length,
      calories
    );

    // Stop rest timer if running
    const { restTimer } = get();
    if (restTimer?.intervalId) clearInterval(restTimer.intervalId);

    set({ activeSession: null, sessionExercises: [], restTimer: null });
    return finished;
  },

  cancelSession: async () => {
    const { activeSession, restTimer } = get();
    if (!activeSession) return;

    if (restTimer?.intervalId) clearInterval(restTimer.intervalId);

    await gymService.cancelSession(activeSession.id);
    set({ activeSession: null, sessionExercises: [], restTimer: null });
  },

  refreshSessionExercises: async () => {
    const { activeSession } = get();
    if (!activeSession) return;

    const exercises = await gymService.getSessionExercisesWithSets(activeSession.id);

    // Load previous session data for each exercise
    const withHistory = await Promise.all(
      exercises.map(async (we) => {
        try {
          const history = await gymService.getExerciseHistory(we.exercise_id, 1);
          return { ...we, previousSets: history.length > 0 ? history : null };
        } catch {
          return { ...we, previousSets: null };
        }
      })
    );

    set({ sessionExercises: withHistory });
  },

  addExercise: async (exerciseId: string) => {
    const { activeSession } = get();
    if (!activeSession) return;

    await gymService.addExerciseToSession(activeSession.id, exerciseId);

    // Add a default first set
    const exercises = await gymService.getSessionExercisesWithSets(activeSession.id);
    const newExercise = exercises[exercises.length - 1];
    if (newExercise && newExercise.sets.length === 0) {
      await gymService.addSet({
        workout_exercise_id: newExercise.id,
        set_number: 1,
        set_type: 'normal',
      });
    }

    // Refresh with history
    const updated = await gymService.getSessionExercisesWithSets(activeSession.id);
    const withHistory = await Promise.all(
      updated.map(async (we) => {
        try {
          const history = await gymService.getExerciseHistory(we.exercise_id, 1);
          return { ...we, previousSets: history.length > 0 ? history : null };
        } catch {
          return { ...we, previousSets: null };
        }
      })
    );

    set({ sessionExercises: withHistory });
  },

  removeExercise: async (workoutExerciseId: string) => {
    await gymService.removeExerciseFromSession(workoutExerciseId);
    set((state) => ({
      sessionExercises: state.sessionExercises.filter((we) => we.id !== workoutExerciseId),
    }));
  },

  addSet: async (workoutExerciseId: string) => {
    const { sessionExercises } = get();
    const exercise = sessionExercises.find((we) => we.id === workoutExerciseId);
    const nextSetNum = exercise ? exercise.sets.length + 1 : 1;

    const newSet = await gymService.addSet({
      workout_exercise_id: workoutExerciseId,
      set_number: nextSetNum,
      set_type: 'normal',
    });

    set((state) => ({
      sessionExercises: state.sessionExercises.map((we) =>
        we.id === workoutExerciseId
          ? { ...we, sets: [...we.sets, newSet] }
          : we
      ),
    }));
  },

  updateSet: async (setId: string, data) => {
    const updated = await gymService.updateSet(setId, data);
    set((state) => ({
      sessionExercises: state.sessionExercises.map((we) => ({
        ...we,
        sets: we.sets.map((s) => (s.id === setId ? updated : s)),
      })),
    }));
  },

  deleteSet: async (setId: string) => {
    await gymService.deleteSet(setId);
    set((state) => ({
      sessionExercises: state.sessionExercises.map((we) => ({
        ...we,
        sets: we.sets.filter((s) => s.id !== setId),
      })),
    }));
  },

  completeSet: async (setId: string, exerciseId: string) => {
    const completed = await gymService.completeSet(setId);

    // Check for PRs if weight and reps are set
    let prResult = { isPR: false, prTypes: [] as string[] };
    if (completed.weight_kg && completed.reps) {
      const { activeSession } = get();
      prResult = await gymService.checkAndUpdatePR(
        exerciseId,
        completed.weight_kg,
        completed.reps,
        activeSession?.id ?? ''
      );

      if (prResult.isPR) {
        completed.is_pr = true;
        await gymService.updateSet(setId, { is_pr: true });
      }
    }

    set((state) => ({
      sessionExercises: state.sessionExercises.map((we) => ({
        ...we,
        sets: we.sets.map((s) => (s.id === setId ? completed : s)),
      })),
    }));

    return prResult;
  },

  startRestTimer: (seconds: number) => {
    const { restTimer } = get();
    if (restTimer?.intervalId) clearInterval(restTimer.intervalId);

    const intervalId = setInterval(() => {
      const current = get().restTimer;
      if (!current || current.remaining <= 1) {
        if (current?.intervalId) clearInterval(current.intervalId);
        set({ restTimer: null });
        return;
      }
      set({ restTimer: { ...current, remaining: current.remaining - 1 } });
    }, 1000);

    set({
      restTimer: { isRunning: true, remaining: seconds, total: seconds, intervalId },
    });
  },

  stopRestTimer: () => {
    const { restTimer } = get();
    if (restTimer?.intervalId) clearInterval(restTimer.intervalId);
    set({ restTimer: null });
  },

  fetchExerciseLibrary: async (category?: string, search?: string) => {
    set({ isLibraryLoading: true });
    try {
      const exercises = await gymService.getExerciseLibrary(category, search);
      set({ exerciseLibrary: exercises, isLibraryLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLibraryLoading: false });
    }
  },

  fetchTemplates: async () => {
    try {
      const templates = await gymService.getTemplates();
      set({ templates });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  saveSessionAsTemplate: async (name: string) => {
    const { activeSession } = get();
    if (!activeSession) return;
    await gymService.saveSessionAsTemplate(activeSession.id, name);
    await get().fetchTemplates();
  },

  startFromTemplate: async (templateId: string) => {
    await get().startSession(undefined, templateId);
  },

  deleteTemplate: async (templateId: string) => {
    await gymService.deleteTemplate(templateId);
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== templateId),
    }));
  },

  fetchRecentSessions: async () => {
    try {
      const sessions = await gymService.getRecentSessions();
      set({ recentSessions: sessions });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));
