import React, { useState, useEffect, useRef } from 'react';
import { ChatIcon, PaperAirplaneIcon } from './icons';
import { ChatMessage, AIAction, DataRow } from '../types';
import { getAIResponse, getAIResponseWithData } from '../services/gemini';

interface AiChatPanelProps {
    onAIAction: (action: AIAction) => void;
    executeQuery: (query: string) => Promise<DataRow[]>;
    availableFields: string[];
}

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
                // First model response: "Let me check..."
                const initialModelMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: textResponse, isLoading: true };
                setMessages(prev => [...prev, initialModelMessage]);
                
                // Execute the query
                const queryResult = await executeQuery(action.query);
                
                // Second model call to summarize data
                const finalResponse = await getAIResponseWithData(userMessage.text, action.query, queryResult);
                 const finalModelMessage: ChatMessage = { id: (Date.now() + 2).toString(), role: 'model', text: finalResponse };
                setMessages(prev => [...prev.slice(0, -1), finalModelMessage]); // Replace loading message

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

    const Message: React.FC<{ message: ChatMessage }> = ({ message }) => (
        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-sm px-3 py-2 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200'}`}>
                {message.isLoading ? (
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-500 dark:bg-slate-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-500 dark:bg-slate-400 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-gray-500 dark:bg-slate-400 rounded-full animate-pulse delay-150"></div>
                    </div>
                ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                )}
            </div>
        </div>
    );

    const PromptButton: React.FC<{text: string}> = ({text}) => (
        <button onClick={() => setInput(text)} className="px-3 py-1.5 text-xs text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors rounded-full">
            {text}
        </button>
    );

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center space-x-2 mb-4">
        <ChatIcon className="h-6 w-6 text-gray-700 dark:text-slate-300"/>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200">AI Assistant</h2>
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
                <PromptButton text="How many jobs are from Nike?" />
                <PromptButton text="Count positions per data source" />
                <PromptButton text="What is the most common language?" />
            </div>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Ask a question or give a command..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isLoading}
                    className="w-full pl-4 pr-12 py-2 text-sm border border-gray-300 rounded-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400 dark:disabled:bg-slate-600"
                    aria-label="Chat input"
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading}
                    aria-label="Send message"
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed">
                    <PaperAirplaneIcon className="h-4 w-4" />
                </button>
            </div>
      </div>

    </div>
  );
};

export default AiChatPanel;