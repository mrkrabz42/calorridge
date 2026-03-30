import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveProfileStore } from '../store/activeProfileStore';
import { Colors, Typography, Spacing, Radius } from '../constants';
import { Profile } from '../services/profileManager';

export default function ProfilePickerScreen() {
  const { profiles, loadProfiles, selectProfile } = useActiveProfileStore();

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleSelect = async (profile: Profile) => {
    await selectProfile(profile.id);
    router.replace('/(tabs)/dashboard');
  };

  const handleCreate = () => {
    router.push('/onboarding');
  };

  const renderProfile = ({ item }: { item: Profile }) => {
    const initial = item.name.charAt(0).toUpperCase();
    return (
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: item.colour }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.profileName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>Who's training?</Text>
        <Text style={styles.subtitle}>Select your profile to get started</Text>

        <FlatList
          data={profiles}
          renderItem={renderProfile}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No profiles yet. Create one to get started.
              </Text>
            </View>
          }
        />

        {profiles.length < 3 && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            activeOpacity={0.7}
          >
            <Text style={styles.createButtonText}>Create New Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  subtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  grid: {
    flexGrow: 1,
    paddingTop: Spacing.md,
  },
  row: {
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  profileCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.lg,
    alignItems: 'center',
    width: 150,
    gap: Spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  profileName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  createButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
});
