import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../state/reducer';
import { ActionType } from '../state/actions';
import { ChatMessage } from '../types';

describe('Chat State Reducer', () => {
    it('should initialize with a welcome message', () => {
        expect(initialState.chatMessages).toHaveLength(1);
        expect(initialState.chatMessages[0].role).toBe('model');
    });

    it('should add a user message', () => {
        const newMessage: ChatMessage = {
            id: 'test-1',
            role: 'user',
            text: 'Hello AI'
        };

        const newState = appReducer(initialState, {
            type: ActionType.ADD_CHAT_MESSAGE,
            payload: newMessage
        });

        expect(newState.chatMessages).toHaveLength(2);
        expect(newState.chatMessages[1]).toEqual(newMessage);
    });

    it('should maintain existing messages when adding a new one', () => {
        const message1: ChatMessage = { id: '1', role: 'user', text: 'One' };
        const message2: ChatMessage = { id: '2', role: 'model', text: 'Two' };

        let state = appReducer(initialState, {
            type: ActionType.SET_CHAT_MESSAGES,
            payload: [message1]
        });

        state = appReducer(state, {
            type: ActionType.ADD_CHAT_MESSAGE,
            payload: message2
        });

        expect(state.chatMessages).toHaveLength(2);
        expect(state.chatMessages[1]).toEqual(message2);
    });

    it('should update ai loading state', () => {
        let state = appReducer(initialState, {
            type: ActionType.SET_AI_LOADING,
            payload: true
        });
        expect(state.isAiLoading).toBe(true);

        state = appReducer(state, {
            type: ActionType.SET_AI_LOADING,
            payload: false
        });
        expect(state.isAiLoading).toBe(false);
    });
});
