import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useGymStore } from '../../store/gymStore';
import { useProfileStore } from '../../store/profileStore';
import { ExerciseCard } from '../../components/gym/ExerciseCard';
import { SessionTimer } from '../../components/gym/SessionTimer';
import { RestTimerOverlay } from '../../components/gym/RestTimerOverlay';
import { Colors, Typography, Spacing, Radius } from '../../constants';

export default function SessionScreen() {
  const {
    activeSession,
    sessionExercises,
    restTimer,
    refreshSessionExercises,
    addSet,
    updateSet,
    completeSet,
    deleteSet,
    removeExercise,
    finishSession,
    cancelSession,
    startRestTimer,
    stopRestTimer,
  } = useGymStore();

  const profile = useProfileStore((s) => s.profile);

  const [sessionName, setSessionName] = useState('');

  useEffect(() => {
    if (activeSession) {
      setSessionName(activeSession.name ?? '');
      refreshSessionExercises();
    }
  }, [activeSession?.id]);

  const handleFinish = () => {
    if (sessionExercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise before finishing.');
      return;
    }

    const uncompletedSets = sessionExercises.flatMap((we) =>
      we.sets.filter((s) => !s.is_completed)
    );

    const doFinish = async () => {
      try {
        const userWeight = profile?.weight_kg ?? null;
        const finished = await finishSession(userWeight);
        router.replace(`/gym/session-summary/${finished.id}`);
      } catch (err) {
        Alert.alert('Error', (err as Error).message);
      }
    };

    if (uncompletedSets.length > 0) {
      Alert.alert(
        'Incomplete Sets',
        `You have ${uncompletedSets.length} incomplete set${uncompletedSets.length > 1 ? 's' : ''}. Finish anyway?`,
        [
          { text: 'Keep Going', style: 'cancel' },
          { text: 'Finish', onPress: doFinish },
        ]
      );
    } else {
      doFinish();
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Workout',
      'This will discard all progress. Are you sure?',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await cancelSession();
            router.back();
          },
        },
      ]
    );
  };

  const handleCompleteSet = async (setId: string, exerciseId: string) => {
    const result = await completeSet(setId, exerciseId);
    if (result.isPR) {
      Alert.alert('Personal Record!', `New PR: ${result.prTypes.join(', ')}`);
    }
  };

  if (!activeSession) {
    return (
      <View style={styles.emptyRoot}>
        <Text style={styles.emptyText}>No active session</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <TextInput
            style={styles.sessionNameInput}
            value={sessionName}
            onChangeText={setSessionName}
            placeholder="Workout Name"
            placeholderTextColor={Colors.text.muted}
            returnKeyType="done"
          />
          <SessionTimer startedAt={activeSession.started_at} />
        </View>

        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {sessionExercises.map((we) => (
          <ExerciseCard
            key={we.id}
            exercise={we}
            onAddSet={addSet}
            onUpdateSet={updateSet}
            onCompleteSet={handleCompleteSet}
            onDeleteSet={deleteSet}
            onRemoveExercise={removeExercise}
            onRestTimerStart={startRestTimer}
          />
        ))}

        {sessionExercises.length === 0 && (
          <View style={styles.noExercises}>
            <Text style={styles.noExercisesText}>
              No exercises yet. Tap below to add one.
            </Text>
          </View>
        )}

        {/* Add Exercise button */}
        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => router.push('/gym/exercise-picker')}
          activeOpacity={0.8}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </TouchableOpacity>

        <View style={{ height: restTimer ? 200 : 60 }} />
      </ScrollView>

      {/* Rest Timer Overlay */}
      {restTimer && restTimer.isRunning && (
        <RestTimerOverlay
          remaining={restTimer.remaining}
          total={restTimer.total}
          onSkip={stopRestTimer}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  sessionNameInput: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    minWidth: 140,
    paddingVertical: 2,
  },
  cancelText: {
    color: Colors.status.error,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  finishBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  finishBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  noExercises: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  noExercisesText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.base,
  },
  addExerciseBtn: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  addExerciseText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  emptyRoot: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.lg,
  },
  backBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  backBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
