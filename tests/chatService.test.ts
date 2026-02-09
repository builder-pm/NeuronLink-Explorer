import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatService } from '../services/chatService';
import * as supabaseService from '../services/supabase';

// Mock getClient
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();

const mockSupabase = {
    from: vi.fn(() => ({
        insert: mockInsert,
        select: mockSelect,
        update: mockUpdate,
    })),
};

// Chain mocks
mockInsert.mockReturnValue({ select: mockSelect });
mockSelect.mockReturnValue({
    single: mockSingle,
    eq: mockEq,
    order: mockOrder
});
mockUpdate.mockReturnValue({ eq: mockEq }); // Fix: Update returns object with eq
mockEq.mockReturnValue({ order: mockOrder });
mockOrder.mockReturnValue({ data: [], error: null });
mockSingle.mockReturnValue({ data: { id: 'thread-1' }, error: null });

describe('chatService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabase as any);
        // Default success
        mockSingle.mockReturnValue({ data: { id: 'thread-1' }, error: null });
    });

    it('should create a thread', async () => {
        const title = 'Test Thread';
        const userId = 'user-1';

        const result = await chatService.createThread(title, userId);

        expect(mockSupabase.from).toHaveBeenCalledWith('chat_threads');
        expect(mockInsert).toHaveBeenCalledWith({ title, user_id: userId });
        expect(result).toEqual({ id: 'thread-1' });
    });

    it('should return null if create thread fails', async () => {
        // Override for failure
        mockSingle.mockReturnValueOnce({ data: null, error: { message: 'Error' } });

        const result = await chatService.createThread('Title', 'user-1');

        expect(result).toBeNull();
    });

    it('should add a message', async () => {
        const threadId = 'thread-1';
        const message = {
            id: 'msg-1',
            role: 'user',
            text: 'Hello',
            isLoading: false
        };

        mockInsert.mockReturnValue({ error: null }); // Ensure insert returns success for this test

        await chatService.addMessage(threadId, message as any);

        expect(mockSupabase.from).toHaveBeenCalledWith('chat_messages');
        expect(mockInsert).toHaveBeenCalledWith({
            thread_id: threadId,
            role: 'user',
            content: 'Hello',
            metadata: { isLoading: false }
        });

        // Should update thread timestamp
        expect(mockSupabase.from).toHaveBeenCalledWith('chat_threads');
        expect(mockUpdate).toHaveBeenCalled();
    });
});
