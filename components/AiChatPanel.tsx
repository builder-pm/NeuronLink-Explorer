import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatIcon, PaperAirplaneIcon, AISparklesIcon, DatabaseIcon } from './icons';
import { ChatMessage, AIAction } from '../types';
import { Plus, Sparkles, Table, ChevronDown, ChevronUp, Copy, Check, User, LayoutGrid, Terminal, Lightbulb, Square } from 'lucide-react';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../services/gemini';

interface AiChatPanelProps {
    onAIAction: (action: AIAction) => void;
    suggestedPrompts: string[];
    chatMessages: ChatMessage[];
    onSendMessage: (text: string, modelId: string) => void;
    onCancelAI?: () => void;
    isLoading: boolean;
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
                        <span className="text-muted-foreground">&rarr;</span>
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

// Action Card Component for AI actions
const ActionCard: React.FC<{ action: AIAction }> = ({ action }) => {
    if (action.action === 'propose_analysis' && action.analysisProposal) {
        const { pivotConfig, filters } = action.analysisProposal;
        return (
            <div className="mt-3 p-3 border-2 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Pivot Applied</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                    {pivotConfig.rows.length > 0 && (
                        <div><span className="font-semibold text-foreground">Rows:</span> {pivotConfig.rows.join(', ')}</div>
                    )}
                    {pivotConfig.columns.length > 0 && (
                        <div><span className="font-semibold text-foreground">Columns:</span> {pivotConfig.columns.join(', ')}</div>
                    )}
                    {pivotConfig.values.length > 0 && (
                        <div><span className="font-semibold text-foreground">Values:</span> {pivotConfig.values.map(v => `${v.aggregation}(${v.field})`).join(', ')}</div>
                    )}
                    {filters && filters.length > 0 && (
                        <div><span className="font-semibold text-foreground">Filters:</span> {filters.length} applied</div>
                    )}
                </div>
            </div>
        );
    }

    if (action.action === 'propose_model' && action.modelProposal) {
        const tableCount = Object.keys(action.modelProposal.modelConfiguration).length;
        const joinCount = action.modelProposal.joins.length;
        return (
            <div className="mt-3 p-3 border-2 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                    <DatabaseIcon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Model Proposed</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                    <div><span className="font-semibold text-foreground">{tableCount}</span> table{tableCount !== 1 ? 's' : ''} configured</div>
                    <div><span className="font-semibold text-foreground">{joinCount}</span> join{joinCount !== 1 ? 's' : ''} defined</div>
                </div>
            </div>
        );
    }

    if (action.action === 'query' && action.query) {
        return (
            <div className="mt-3 p-3 border-2 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                    <Terminal className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Query Executed</span>
                </div>
                <pre className="text-xs font-mono text-muted-foreground bg-background/50 p-2 border border-border overflow-x-auto max-h-24">
                    {action.query.length > 120 ? action.query.substring(0, 120) + '...' : action.query}
                </pre>
            </div>
        );
    }

    return null;
};

// Thinking Indicator Component
const ThinkingIndicator: React.FC = () => {
    const [dots, setDots] = useState('.');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '.' : prev + '.');
        }, 400);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex justify-start gap-2">
            <div className="flex-shrink-0 mt-1">
                <AISparklesIcon className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="max-w-[85%] px-3 py-2 border-2 border-border bg-card text-foreground shadow-brutal">
                <span className="text-sm text-muted-foreground font-mono">
                    Thinking<span className="inline-block w-6 text-left">{dots}</span>
                </span>
            </div>
        </div>
    );
};

// Copy Button Component
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API unavailable (non-HTTPS or permission denied)
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Copy message"
        >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
    );
};

// Markdown components for ReactMarkdown
const markdownComponents: Record<string, React.FC<any>> = {
    p: ({ children }: any) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    ul: ({ children }: any) => <ul className="text-sm list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
    ol: ({ children }: any) => <ol className="text-sm list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
    li: ({ children }: any) => <li className="text-sm">{children}</li>,
    a: ({ href, children }: any) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
            {children}
        </a>
    ),
    table: ({ children }: any) => (
        <div className="overflow-x-auto mb-2">
            <table className="text-xs border-2 border-border w-full">{children}</table>
        </div>
    ),
    thead: ({ children }: any) => <thead className="bg-muted">{children}</thead>,
    th: ({ children }: any) => <th className="border-2 border-border px-2 py-1 text-left font-bold">{children}</th>,
    td: ({ children }: any) => <td className="border-2 border-border px-2 py-1">{children}</td>,
    code: ({ className, children, ...props }: any) => {
        // Block code has a language className OR contains newlines
        const content = String(children).replace(/\n$/, '');
        const isBlock = !!className || content.includes('\n');
        if (!isBlock) {
            return (
                <code className="bg-muted px-1 py-0.5 text-xs font-mono border border-border" {...props}>
                    {children}
                </code>
            );
        }
        return (
            <pre className="bg-background border-2 border-border p-3 overflow-x-auto text-xs">
                <code className="font-mono" {...props}>{children}</code>
            </pre>
        );
    },
    pre: ({ children }: any) => <div className="relative mb-2">{children}</div>,
    blockquote: ({ children }: any) => (
        <blockquote className="border-l-4 border-primary pl-3 my-2 text-muted-foreground italic">{children}</blockquote>
    ),
    hr: () => <hr className="border-t-2 border-border my-3" />,
};

// Format timestamp
const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Message: React.FC<{
    message: ChatMessage;
    onApplySuggestion?: (action: AIAction) => void;
    appliedSuggestions?: Set<string>;
}> = ({ message, onApplySuggestion, appliedSuggestions }) => {
    const isUser = message.role === 'user';
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
            {/* AI icon */}
            {!isUser && (
                <div className="flex-shrink-0 mt-1">
                    <AISparklesIcon className="h-5 w-5 text-primary" />
                </div>
            )}

            <div
                className="flex flex-col max-w-[85%]"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className={`px-3 py-2 border-2 border-border ${isUser ? 'bg-primary text-primary-foreground shadow-brutal' : 'bg-card text-foreground shadow-brutal'}`}>
                    {message.isLoading ? (
                        <div className="flex items-center gap-2">
                            <AISparklesIcon className="h-4 w-4 text-primary animate-pulse" />
                            <span className="text-sm text-muted-foreground font-mono">Processing...</span>
                        </div>
                    ) : (
                        <>
                            {isUser ? (
                                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                            ) : (
                                <div className="prose-brutalist">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                        {message.text}
                                    </ReactMarkdown>
                                </div>
                            )}
                            {/* Action Card */}
                            {!isUser && message.appliedAction && (
                                <ActionCard action={message.appliedAction} />
                            )}
                            {/* Suggestion Block */}
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

                {/* Timestamp + copy button row */}
                <div className="flex items-center gap-1 mt-0.5 px-1">
                    {message.timestamp && (
                        <span className="text-[9px] text-muted-foreground">{formatTime(message.timestamp)}</span>
                    )}
                    {!isUser && !message.isLoading && isHovered && (
                        <CopyButton text={message.text} />
                    )}
                </div>
            </div>

            {/* User icon */}
            {isUser && (
                <div className="flex-shrink-0 mt-1">
                    <User className="h-5 w-5 text-muted-foreground" />
                </div>
            )}
        </div>
    );
};

const PromptPill: React.FC<{ text: string, onClick: (text: string) => void }> = ({ text, onClick }) => (
    <button onClick={() => onClick(text)} className="px-3 py-1.5 text-[11px] text-left bg-muted/50 border-2 border-border hover:border-primary hover:bg-primary/10 transition-all tracking-wide font-medium text-foreground">
        {text}
    </button>
);

// Collapsible Suggested Prompts Panel
const SuggestedPrompts: React.FC<{
    prompts: string[];
    onSelect: (text: string) => void;
}> = ({ prompts, onSelect }) => {
    const [isMinimized, setIsMinimized] = useState(() => {
        try { return localStorage.getItem('neuronlink_suggestions_minimized') === 'true'; }
        catch { return false; }
    });

    const toggleMinimize = () => {
        const next = !isMinimized;
        setIsMinimized(next);
        try { localStorage.setItem('neuronlink_suggestions_minimized', String(next)); }
        catch { /* noop */ }
    };

    if (prompts.length === 0) return null;

    return (
        <div className="border-t-2 border-border">
            <button
                onClick={toggleMinimize}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <Lightbulb className="h-3 w-3" />
                    Suggestions
                </span>
                {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {!isMinimized && (
                <div className="px-2 pb-2 flex flex-wrap gap-1.5">
                    {prompts.map((prompt, idx) => (
                        <PromptPill key={idx} text={prompt} onClick={onSelect} />
                    ))}
                </div>
            )}
        </div>
    );
};

// Model Selector Dropdown
const ModelSelector: React.FC<{
    selectedModel: string;
    onModelChange: (modelId: string) => void;
}> = ({ selectedModel, onModelChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-muted/50 border-2 border-border hover:border-primary hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
            >
                <Sparkles className="h-3 w-3 text-primary" />
                <span>{currentModel.name}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-card border-2 border-border shadow-brutal z-50">
                    <div className="px-3 py-2 border-b border-border">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Select Model</span>
                    </div>
                    {AVAILABLE_MODELS.map((model) => (
                        <button
                            key={model.id}
                            onClick={() => {
                                onModelChange(model.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-all hover:bg-muted/50
                                ${model.id === selectedModel ? 'bg-primary/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}
                            `}
                        >
                            <span className="text-xs font-bold text-foreground">{model.name}</span>
                            <span className="text-[10px] text-muted-foreground">{model.provider}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const AiChatPanel: React.FC<AiChatPanelProps> = ({ onAIAction, suggestedPrompts, chatMessages, onSendMessage, onCancelAI, isLoading }) => {
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
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
        onSendMessage(input.trim(), selectedModel);
        setInput('');
    };

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <ChatIcon className="h-6 w-6 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide font-mono">AI Assistant</h2>
                </div>
                <ModelSelector
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                />
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
                {isLoading && !chatMessages.some(m => m.isLoading) && <ThinkingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            <div className="pt-2 mt-2">
                <SuggestedPrompts prompts={suggestedPrompts} onSelect={setInput} />
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
                        onClick={isLoading ? onCancelAI : handleSend}
                        aria-label={isLoading ? "Stop AI" : "Send message"}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 p-2 border-2 border-border transition-all
                            ${isLoading
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80'
                                : 'bg-primary text-primary-foreground hover:shadow-brutal'
                            }`}>
                        {isLoading ? <Square className="h-4 w-4" /> : <PaperAirplaneIcon className="h-4 w-4" />}
                    </button>
                </div>
            </div>

        </div>
    );
};

export default AiChatPanel;
