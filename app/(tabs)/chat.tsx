import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useChatStore } from '../../store/chatStore';
import { useMealsStore } from '../../store/mealsStore';
import { useGoalsStore } from '../../store/goalsStore';
import { useWorkoutsStore } from '../../store/workoutsStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useProfileStore } from '../../store/profileStore';
import { usePantryStore } from '../../store/pantryStore';
import { mealsService } from '../../services/mealsService';
import { sumMealsToday, getTodayDateString } from '../../utils/macroUtils';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { ChatMessage, ChatMessageMetadata } from '../../types/chat';

export default function ChatScreen() {
  const {
    messages, conversation, isLoading, isSending,
    initConversation, sendMessage, clearChat,
  } = useChatStore();

  const { todayMeals, addMealOptimistic } = useMealsStore();
  const { goals } = useGoalsStore();
  const { todayWorkouts } = useWorkoutsStore();
  const { activeChallenge, challengeDays } = useChallengeStore();
  const { profile } = useProfileStore();
  const { getItemNames } = usePantryStore();

  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<{ base64: string; uri: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const buildContext = useCallback(() => {
    const nutrition = sumMealsToday(todayMeals);
    const burned = todayWorkouts.reduce((s, w) => s + w.calories_burned, 0);

    return {
      todayMeals: todayMeals.map((m) => ({
        food_name: m.food_name, meal_type: m.meal_type,
        calories: m.calories, protein_g: m.protein_g, carbs_g: m.carbs_g, fat_g: m.fat_g,
      })),
      goals: { calories: goals.calories, protein_g: goals.protein_g, carbs_g: goals.carbs_g, fat_g: goals.fat_g, fiber_g: goals.fiber_g },
      todayNutrition: {
        consumed: nutrition.total_calories,
        burned,
        net: nutrition.total_calories - burned,
        protein_g: nutrition.total_protein_g,
        carbs_g: nutrition.total_carbs_g,
        fat_g: nutrition.total_fat_g,
      },
      recentWorkouts: todayWorkouts.map((w) => ({
        exercise_name: w.exercise_name, duration_mins: w.duration_mins,
        calories_burned: w.calories_burned,
      })),
      activeChallenge: activeChallenge ? {
        name: activeChallenge.name, goal_type: activeChallenge.goal_type,
        target_calories: activeChallenge.target_calories, day_count: activeChallenge.duration_days,
      } : null,
      userProfile: profile ? {
        weight_kg: profile.weight_kg, height_cm: profile.height_cm,
        age: profile.age, sex: profile.sex, activity_level: profile.activity_level,
        goal_type: profile.goal_type,
      } : null,
      pantryItems: getItemNames(),
    };
  }, [todayMeals, goals, todayWorkouts, activeChallenge, profile, getItemNames]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setAttachedImage({
        base64: result.assets[0].base64,
        uri: result.assets[0].uri,
      });
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const imageB64 = attachedImage?.base64 ?? undefined;
    setInput('');
    setAttachedImage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendMessage(text, buildContext(), imageB64, imageB64 ? 'image/jpeg' : undefined);
  };

  const handleLogPrompt = async (metadata: ChatMessageMetadata) => {
    if (!metadata.logPrompt) return;
    const lp = metadata.logPrompt;
    try {
      const meal = await mealsService.createMeal({
        meal_type: 'snack',
        meal_date: getTodayDateString(),
        food_name: lp.food_name,
        calories: lp.calories,
        protein_g: lp.protein_g,
        carbs_g: lp.carbs_g,
        fat_g: lp.fat_g,
      });
      addMealOptimistic(meal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Logged', `${lp.food_name} added to your meals.`);
    } catch {
      Alert.alert('Error', 'Failed to log meal.');
    }
  };

  const handleClear = () => {
    Alert.alert('Clear Chat', 'Delete all messages?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearChat },
    ]);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const meta = item.metadata as ChatMessageMetadata | null;

    return (
      <View style={[styles.msgContainer, isUser ? styles.msgUser : styles.msgAssistant]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAssistant]}>
            {item.content}
          </Text>
        </View>
        {meta?.logPrompt && (
          <TouchableOpacity
            style={styles.logPromptBtn}
            onPress={() => handleLogPrompt(meta)}
          >
            <Text style={styles.logPromptText}>
              Log {meta.logPrompt.food_name} ({meta.logPrompt.calories} kcal)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatIcon}>Chat</Text>
            <Text style={styles.emptyChatTitle}>Hey! I'm CalorRidge</Text>
            <Text style={styles.emptyChatText}>
              Ask me about nutrition, meals, workouts, or your progress. I can see your data and give personalised advice.
            </Text>
            <View style={styles.promptSuggestions}>
              {[
                'How am I doing today?',
                'What should I eat for dinner?',
                'Give me a meal plan for tomorrow',
              ].map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={styles.promptChip}
                  onPress={() => { setInput(prompt); }}
                >
                  <Text style={styles.promptChipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />

      {/* Typing indicator */}
      {isSending && (
        <View style={styles.typingContainer}>
          <ActivityIndicator color={Colors.brand.primary} size="small" />
          <Text style={styles.typingText}>CalorRidge is thinking...</Text>
        </View>
      )}

      {/* Attached image preview */}
      {attachedImage && (
        <View style={styles.attachedImageRow}>
          <Image source={{ uri: attachedImage.uri }} style={styles.attachedImageThumb} />
          <Text style={styles.attachedImageText}>Image attached</Text>
          <TouchableOpacity onPress={() => setAttachedImage(null)}>
            <Text style={styles.attachedImageRemove}>X</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Del</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handlePickImage} style={styles.imgBtn}>
          <Text style={styles.imgBtnText}>Img</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ask CalorRidge anything..."
          placeholderTextColor={Colors.text.muted}
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isSending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isSending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  messageList: { padding: Spacing.md, paddingBottom: Spacing.sm },
  msgContainer: { marginBottom: Spacing.sm, maxWidth: '85%' },
  msgUser: { alignSelf: 'flex-end' },
  msgAssistant: { alignSelf: 'flex-start' },
  bubble: { borderRadius: Radius.lg, padding: Spacing.sm, paddingHorizontal: Spacing.md },
  bubbleUser: { backgroundColor: Colors.brand.primary, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: Colors.bg.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border.default },
  msgText: { fontSize: Typography.sizes.base, lineHeight: 22 },
  msgTextUser: { color: Colors.text.inverse },
  msgTextAssistant: { color: Colors.text.primary },
  logPromptBtn: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.brand.primary + '15',
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
    alignSelf: 'flex-start',
  },
  logPromptText: { color: Colors.brand.primary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  typingText: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    backgroundColor: Colors.bg.secondary,
  },
  clearBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bg.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border.default,
  },
  clearBtnText: { fontSize: 10, color: Colors.text.secondary, fontWeight: Typography.weights.bold },
  imgBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bg.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.brand.primary + '40',
  },
  imgBtnText: { fontSize: 10, color: Colors.brand.primary, fontWeight: Typography.weights.bold },
  attachedImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  attachedImageThumb: {
    width: 40, height: 40, borderRadius: Radius.sm,
  },
  attachedImageText: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  attachedImageRemove: {
    color: Colors.status.error,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    padding: Spacing.xs,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: Colors.text.inverse, fontSize: 18, fontWeight: Typography.weights.bold },
  emptyChat: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyChatIcon: { fontSize: 28, color: Colors.brand.primary, fontWeight: Typography.weights.bold },
  emptyChatTitle: { color: Colors.text.primary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  emptyChatText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, textAlign: 'center', paddingHorizontal: Spacing.xl, lineHeight: 20 },
  promptSuggestions: { gap: Spacing.sm, marginTop: Spacing.md, width: '100%', paddingHorizontal: Spacing.md },
  promptChip: {
    padding: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: Radius.md, backgroundColor: Colors.bg.card,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  promptChipText: { color: Colors.brand.primary, fontSize: Typography.sizes.sm },
});
