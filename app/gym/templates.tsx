import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useGymStore } from '../../store/gymStore';
import { WorkoutTemplate } from '../../types/gym';
import { gymService } from '../../services/gymService';
import { Colors, Typography, Spacing, Radius } from '../../constants';

export default function TemplatesScreen() {
  const {
    templates,
    fetchTemplates,
    startFromTemplate,
    deleteTemplate,
    isSessionLoading,
  } = useGymStore();

  const [templateExCounts, setTemplateExCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await fetchTemplates();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    // Fetch exercise counts for each template
    (async () => {
      const counts: Record<string, number> = {};
      for (const t of templates) {
        try {
          const exs = await gymService.getTemplateExercises(t.id);
          counts[t.id] = exs.length;
        } catch {
          counts[t.id] = 0;
        }
      }
      setTemplateExCounts(counts);
    })();
  }, [templates]);

  const handleStart = (template: WorkoutTemplate) => {
    Alert.alert(
      'Start Workout',
      `Start "${template.name}" workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            await startFromTemplate(template.id);
            router.replace('/gym/session');
          },
        },
      ]
    );
  };

  const handleDelete = (template: WorkoutTemplate) => {
    Alert.alert(
      'Delete Template',
      `Delete "${template.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTemplate(template.id),
        },
      ]
    );
  };

  const handleStartEmpty = async () => {
    const { startSession, activeSession } = useGymStore.getState();
    if (activeSession) {
      router.replace('/gym/session');
      return;
    }
    await startSession();
    router.replace('/gym/session');
  };

  const renderTemplate = ({ item }: { item: WorkoutTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleStart(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <View style={styles.templateInfo}>
        <Text style={styles.templateName}>{item.name}</Text>
        <Text style={styles.templateMeta}>
          {templateExCounts[item.id] ?? '...'} exercise{(templateExCounts[item.id] ?? 0) !== 1 ? 's' : ''}
        </Text>
        {item.description && (
          <Text style={styles.templateDesc} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </View>
      <Text style={styles.playIcon}>{'>'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={Colors.brand.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Create from scratch button */}
      <TouchableOpacity
        style={styles.scratchBtn}
        onPress={handleStartEmpty}
        disabled={isSessionLoading}
        activeOpacity={0.8}
      >
        <Text style={styles.scratchBtnText}>
          {isSessionLoading ? 'Starting...' : 'Create from Scratch'}
        </Text>
      </TouchableOpacity>

      {/* Templates list */}
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplate}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          templates.length > 0 ? (
            <Text style={styles.sectionTitle}>Your Templates</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No templates yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete a workout and save it as a template, or start from scratch.
            </Text>
          </View>
        }
        ListFooterComponent={
          templates.length > 0 ? (
            <Text style={styles.hintText}>Long press to delete a template</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scratchBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    margin: Spacing.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  scratchBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  listContent: {
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.sm,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  templateInfo: {
    flex: 1,
    gap: 2,
  },
  templateName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  templateMeta: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  templateDesc: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  playIcon: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    paddingLeft: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  emptySubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  hintText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
