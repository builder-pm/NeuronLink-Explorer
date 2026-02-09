import { getClient } from './supabase';
import { ChatMessage } from '../types';

export interface ChatThread {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export const chatService = {
    // Create a new chat thread
    async createThread(title: string, user_id: string): Promise<ChatThread | null> {
        const supabase = getClient();
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('chat_threads')
            .insert({ title, user_id })
            .select()
            .single();

        if (error) {
            console.error('Error creating chat thread:', error);
            return null;
        }
        return data;
    },

    // Get all threads for the current user
    async getUserThreads(): Promise<ChatThread[]> {
        const supabase = getClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('chat_threads')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching chat threads:', error);
            return [];
        }
        return data || [];
    },

    // Get messages for a specific thread
    async getThreadMessages(threadId: string): Promise<ChatMessage[]> {
        const supabase = getClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching thread messages:', error);
            return [];
        }

        return (data || []).map((msg: any) => ({
            id: msg.id,
            role: msg.role as 'user' | 'model',
            text: msg.content,
            // Restore metadata properties if they exist
            ...msg.metadata
        }));
    },

    // Add a message to a thread
    async addMessage(threadId: string, message: ChatMessage): Promise<void> {
        const supabase = getClient();
        if (!supabase) return;

        const { id, role, text, ...rest } = message;

        // Store extra properties (like suggestions, isLoading, etc) in metadata
        const metadata = rest;

        const { error } = await supabase
            .from('chat_messages')
            .insert({
                thread_id: threadId,
                role,
                content: text,
                metadata
            });

        if (error) {
            console.error('Error adding message to thread:', error);
        } else {
            // Update thread's updated_at timestamp
            await supabase
                .from('chat_threads')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', threadId);
        }
    }
};
