import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { ChatConversation, ChatMessage } from '../types/chat';

export const chatService = {
  async getOrCreateConversation(): Promise<ChatConversation> {
    const profileId = profileManager.getActiveProfileIdSync();
    // Get most recent conversation
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) return existing as ChatConversation;

    // Create new
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({ title: 'CalorRidge Chat', profile_id: profileId })
      .select()
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);
    return data as ChatConversation;
  },

  async getMessages(conversationId: string, limit = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    return (data ?? []) as ChatMessage[];
  },

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata: metadata ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add message: ${error.message}`);

    // Touch conversation updated_at
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data as ChatMessage;
  },

  async sendChat(
    messages: { role: string; content: string }[],
    context: Record<string, unknown>,
    imageBase64?: string,
    imageMediaType?: string
  ): Promise<{ content: string; metadata?: Record<string, unknown> }> {
    const body: Record<string, unknown> = { messages, context };
    if (imageBase64) {
      body.imageBase64 = imageBase64;
      body.imageMediaType = imageMediaType ?? 'image/jpeg';
    }

    const { data, error } = await supabase.functions.invoke('chat', {
      body,
    });

    if (error) throw new Error(`Chat failed: ${error.message}`);
    return data as { content: string; metadata?: Record<string, unknown> };
  },

  async clearConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId);
    if (error) throw new Error(`Failed to clear: ${error.message}`);
  },
};
