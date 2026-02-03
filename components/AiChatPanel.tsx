import React, { useState, useEffect, useRef } from 'react';
import { ChatIcon, PaperAirplaneIcon } from './icons';
import { ChatMessage, AIAction, DataRow } from '../types';
import { getAIResponse, getAIResponseWithData } from '../services/gemini';

interface AiChatPanelProps {
    onAIAction: (action: AIAction) => void;
    executeQuery: (query: string) => Promise<DataRow[]>;
    availableFields: string[];
}

const Message: React.FC<{ message: ChatMessage }> = ({ message }) => (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[85%] px-3 py-2 border-2 border-border ${message.role === 'user' ? 'bg-primary text-primary-foreground shadow-brutal' : 'bg-muted text-foreground shadow-brutal'}`}>
            {message.isLoading ? (
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary animate-pulse"></div>
                    <div className="w-2 h-2 bg-primary animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-primary animate-pulse delay-150"></div>
                </div>
            ) : (
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            )}
        </div>
    </div>
);

const PromptButton: React.FC<{text: string, onClick: (text: string) => void}> = ({text, onClick}) => (
    <button onClick={() => onClick(text)} className="px-3 py-1.5 text-xs text-primary-foreground bg-primary border-2 border-border shadow-brutal hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal-lg transition-all uppercase tracking-wide font-semibold">
        {text}
    </button>
);

const AiChatPanel: React.FC<AiChatPanelProps> = ({ onAIAction, executeQuery, availableFields }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', role: 'model', text: 'Hello! How can I help you analyze your data? You can ask me to find fields, build pivots, or apply filters.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (input.trim() === '' || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input.trim()
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages;
            const { action, textResponse } = await getAIResponse(history, userMessage.text, availableFields);

            if (action?.action === 'query' && action.query) {
                const initialModelMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: textResponse, isLoading: true };
                setMessages(prev => [...prev, initialModelMessage]);

                const queryResult = await executeQuery(action.query);

                const finalResponse = await getAIResponseWithData(userMessage.text, action.query, queryResult);
                 const finalModelMessage: ChatMessage = { id: (Date.now() + 2).toString(), role: 'model', text: finalResponse };
                setMessages(prev => [...prev.slice(0, -1), finalModelMessage]);

            } else {
                 if (action) {
                    onAIAction(action);
                }
                const modelMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    text: textResponse
                };
                setMessages(prev => [...prev, modelMessage]);
            }

        } catch (error) {
            console.error("Error fetching AI response:", error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: 'Sorry, I encountered an error. Please try again.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center space-x-2 mb-4">
        <ChatIcon className="h-6 w-6 text-primary"/>
        <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide font-mono">AI Assistant</h2>
      </div>

      <div
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto pr-2 space-y-4"
      >
            {messages.map((msg) => <Message key={msg.id} message={msg} />)}
            {isLoading && !messages.some(m => m.isLoading) && <Message message={{id: 'loading', role: 'model', text: '', isLoading: true}} />}
            <div ref={messagesEndRef} />
      </div>

       <div className="pt-4 mt-2">
            <div className="flex flex-wrap gap-2 mb-3">
                <PromptButton text="How many jobs are from Nike?" onClick={setInput} />
                <PromptButton text="Count positions per data source" onClick={setInput} />
                <PromptButton text="What is the most common language?" onClick={setInput} />
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
