import React, { useState, useEffect, useRef } from 'react';
import { ChatIcon, PaperAirplaneIcon } from './icons';
import { ChatMessage, AIAction } from '../types';
import { Plus, Sparkles, Table } from 'lucide-react';

interface AiChatPanelProps {
    onAIAction: (action: AIAction) => void;
    suggestedPrompts: string[];
    chatMessages: ChatMessage[];
    onSendMessage: (text: string) => void;
    isLoading: boolean;
}

// Extended message interface to include suggestion payload
interface ExtendedChatMessage extends ChatMessage {
    suggestAction?: AIAction;
}

// Suggestion Block Component - Brutalist style
const SuggestionBlock: React.FC<{
    action: AIAction;
    onApply: () => void;
    isApplied: boolean;
}> = ({ action, onApply, isApplied }) => {
    if (!action.suggestedFields || action.suggestedFields.length === 0) return null;

    return (
        <div className="mt-3 p-3 border-2 border-primary bg-background">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Suggested Fields</span>
            </div>

            {action.reason && (
                <p className="text-xs text-muted-foreground mb-2">{action.reason}</p>
            )}

            <div className="space-y-1 mb-3">
                {action.suggestedFields.map((suggestion, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                        <Table className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono font-semibold">{suggestion.table}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-muted-foreground">{suggestion.fields.join(', ')}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={onApply}
                disabled={isApplied}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider
                    border-2 border-border transition-all
                    ${isApplied
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg'
                    }`}
            >
                <Plus className="h-3 w-3" />
                {isApplied ? 'Added to Model' : 'Add Fields to Model'}
            </button>
        </div>
    );
};

const Message: React.FC<{
    message: ExtendedChatMessage;
    onApplySuggestion?: (action: AIAction) => void;
    appliedSuggestions?: Set<string>;
}> = ({ message, onApplySuggestion, appliedSuggestions }) => (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[85%] px-3 py-2 border-2 border-border ${message.role === 'user' ? 'bg-primary text-primary-foreground shadow-brutal' : 'bg-muted text-foreground shadow-brutal'}`}>
            {message.isLoading ? (
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary animate-pulse"></div>
                    <div className="w-2 h-2 bg-primary animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-primary animate-pulse delay-150"></div>
                </div>
            ) : (
                <>
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    {message.suggestAction && onApplySuggestion && (
                        <SuggestionBlock
                            action={message.suggestAction}
                            onApply={() => onApplySuggestion(message.suggestAction!)}
                            isApplied={appliedSuggestions?.has(message.id) || false}
                        />
                    )}
                </>
            )}
        </div>
    </div>
);

const PromptButton: React.FC<{ text: string, onClick: (text: string) => void }> = ({ text, onClick }) => (
    <button onClick={() => onClick(text)} className="px-3 py-1.5 text-xs text-primary-foreground bg-primary border-2 border-border shadow-brutal hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal-lg transition-all uppercase tracking-wide font-semibold">
        {text}
    </button>
);

const AiChatPanel: React.FC<AiChatPanelProps> = ({ onAIAction, suggestedPrompts, chatMessages, onSendMessage, isLoading }) => {
    // Local state for input only
    const [input, setInput] = useState('');
    const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [chatMessages]);

    const handleApplySuggestion = (action: AIAction, messageId: string) => {
        onAIAction(action);
        setAppliedSuggestions(prev => new Set([...prev, messageId]));
    };

    const handleSend = async () => {
        if (input.trim() === '' || isLoading) return;
        onSendMessage(input.trim());
        setInput('');
    };

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex items-center space-x-2 mb-4">
                <ChatIcon className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide font-mono">AI Assistant</h2>
            </div>

            <div
                role="log"
                aria-live="polite"
                className="flex-1 overflow-y-auto pr-2 space-y-4"
            >
                {chatMessages.map((msg) => (
                    <Message
                        key={msg.id}
                        message={msg}
                        onApplySuggestion={(action) => handleApplySuggestion(action, msg.id)}
                        appliedSuggestions={appliedSuggestions}
                    />
                ))}
                {isLoading && !chatMessages.some(m => m.isLoading) && <Message message={{ id: 'loading', role: 'model', text: '', isLoading: true }} />}
                <div ref={messagesEndRef} />
            </div>

            <div className="pt-4 mt-2">
                <div className="flex flex-wrap gap-2 mb-3">
                    {suggestedPrompts.map((prompt, idx) => (
                        <PromptButton key={idx} text={prompt} onClick={setInput} />
                    ))}
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Ask a question or give a command..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isLoading}
                        className="brutal-input w-full pl-4 pr-12 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Chat input"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        aria-label="Send message"
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground border-2 border-border hover:shadow-brutal transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <PaperAirplaneIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

        </div>
    );
};

export default AiChatPanel;
