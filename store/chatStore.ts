import { create } from 'zustand';
import { ChatMessage, ChatConversation } from '../types/chat';
import { chatService } from '../services/chatService';

interface ChatState {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  initConversation: () => Promise<void>;
  sendMessage: (
    content: string,
    context: Record<string, unknown>,
    imageBase64?: string,
    imageMediaType?: string
  ) => Promise<void>;
  clearChat: () => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  conversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,

  initConversation: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversation = await chatService.getOrCreateConversation();
      const messages = await chatService.getMessages(conversation.id);
      set({ conversation, messages, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  sendMessage: async (content: string, context: Record<string, unknown>, imageBase64?: string, imageMediaType?: string) => {
    const { conversation, messages } = get();
    if (!conversation) return;

    set({ isSending: true, error: null });

    try {
      // Save user message
      const userMsg = await chatService.addMessage(conversation.id, 'user', content);
      set((state) => ({ messages: [...state.messages, userMsg] }));

      // Build message history for API (last 20)
      const history = [...messages, userMsg]
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      // Call AI (pass image only for current message)
      const response = await chatService.sendChat(history, context, imageBase64, imageMediaType);

      // Save assistant message
      const assistantMsg = await chatService.addMessage(
        conversation.id,
        'assistant',
        response.content,
        response.metadata
      );
      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isSending: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isSending: false });
    }
  },

  clearChat: async () => {
    const { conversation } = get();
    if (!conversation) return;
    try {
      await chatService.clearConversation(conversation.id);
      set({ messages: [] });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));
