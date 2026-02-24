'use client';

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import styles from './ChatInterface.module.css';
import type { MicState } from './useVoiceController';

/* ─── Types ────────────────────────────────────────────────── */

interface Message {
    id: string;
    text: string;
    type: 'user' | 'assistant' | 'system';
    modelUsed?: string;
    recipeName?: string;
    // Disambiguation data (rendered as chips)
    disambiguation?: { sessionId: number; recipe: string; currentStep: number; totalSteps: number }[];
    disambigUserMessage?: string;   // original user message — chip click replays this to the chosen session
    recipeDisambiguation?: { recipeId: number; title: string; steps: number }[];
    // Timer suggestions
    timerSuggestions?: { label: string; durationSeconds: number; recipe: string }[];
    // Completion prompt
    awaitingCompletion?: boolean;
    // End-session confirmation prompt
    awaitingEndConfirmation?: boolean;
    sessionId?: number;
}

export interface ChatInterfaceHandle {
    sendMessage: (text: string) => void;
}

interface ChatInterfaceProps {
    isAuthenticated: boolean;
    onSessionsChanged?: () => void;   // callback to refresh sessions in parent
    onTimerStarted?: (timer: { label: string; durationSeconds: number; recipe: string }) => void;
    onAssistantMessage?: (text: string) => void;  // voice TTS callback
    micState?: MicState;
    onMicToggle?: () => void;
}

/* ─── Component ────────────────────────────────────────────── */

const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(
    function ChatInterface({ isAuthenticated, onSessionsChanged, onTimerStarted, onAssistantMessage, micState, onMicToggle }, ref) {

        const [messages, setMessages] = useState<Message[]>([
            { id: 'welcome', text: 'Welcome back! What are we cooking today?', type: 'system' }
        ]);
        const [inputValue, setInputValue] = useState('');
        const [isLoading, setIsLoading] = useState(false);
        const msgCounterRef = useRef(0);
        const nextId = () => `msg-${Date.now()}-${++msgCounterRef.current}`;
        const messagesEndRef = useRef<HTMLDivElement>(null);
        // Pending recipe disambiguation state (session disambiguation is now conversational via LLM)
        const pendingRecipeDisambRef = useRef<{ text: string; recipes: any[] } | null>(null);

        const scrollToBottom = () => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        };

        useEffect(() => {
            scrollToBottom();
        }, [messages, isLoading]);

        /* ─── Timer-tag helpers ─────────────────── */

        // Safety-net regex: backend strips [TIMER:...] tags, but if any leak through, clean them.
        const TIMER_TAG_RE = /\[\s*TIMER(?:_START)?:\d+:[^\]]+?\s*\]/g;

        /** Strip any residual timer tags from text for display and speech. */
        const stripTimerTags = (text: string): string =>
            text.replace(TIMER_TAG_RE, '').replace(/\s{2,}/g, ' ').trim();

        /** Whether voice mode is currently active. */
        const isVoiceMode = micState && micState !== 'disabled';

        /** Speak text via voice callback, stripping timer tags first. */
        const voiceOut = (text: string) => {
            if (!text) return;
            onAssistantMessage?.(stripTimerTags(text));
        };

        /** Format seconds into a spoken duration string. */
        const spokenDuration = (secs: number): string => {
            if (secs >= 3600) {
                const h = Math.floor(secs / 3600);
                const m = Math.round((secs % 3600) / 60);
                return m > 0 ? `${h} hour${h > 1 ? 's' : ''} and ${m} minute${m > 1 ? 's' : ''}` : `${h} hour${h > 1 ? 's' : ''}`;
            }
            const m = Math.round(secs / 60);
            return `${m} minute${m > 1 ? 's' : ''}`;
        };

        /** Start a timer and announce it if in voice mode. */
        const startTimerWithAnnounce = (timer: { label: string; durationSeconds: number; recipe: string }, sessionId?: number) => {
            onTimerStarted?.(timer);
            if (isVoiceMode) {
                voiceOut(`Starting ${timer.label} timer for ${spokenDuration(timer.durationSeconds)}.`);
            }
            // Persist to backend if we have a sessionId
            if (sessionId) {
                fetch('/api/cooking/timer/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify({ sessionId, label: timer.label, durationSeconds: timer.durationSeconds })
                }).then(res => { if (res.ok) onSessionsChanged?.(); }).catch(() => { });
            }
        };

        /* ─── Core send logic ───────────────────── */

        const doSend = useCallback(async (text: string, extraBody?: Record<string, any>) => {
            if (!text || !isAuthenticated) return;
            setIsLoading(true);
            try {
                const body: Record<string, any> = { text, ...extraBody };
                const res = await fetch('/api/cooking/input', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify(body)
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setMessages(prev => [...prev, {
                        id: nextId(), text: data.error || 'Something went wrong.', type: 'system'
                    }]);
                    return;
                }
                handleResponse(data, text);
            } catch (e) {
                setMessages(prev => [...prev, {
                    id: nextId(), text: 'Failed to connect to the server.', type: 'system'
                }]);
            } finally {
                setIsLoading(false);
            }
        }, [isAuthenticated, onSessionsChanged, onTimerStarted, onAssistantMessage]); // eslint-disable-line react-hooks/exhaustive-deps

        /**
         * Handle the structured JSON response from /api/cooking/input.
         * Handles all response shapes: disambiguation, recipeDisambiguation,
         * sessionStarted, awaitingEndConfirmation, sessionCompleted, normal response.
         */
        const handleResponse = useCallback((data: any, originalText: string) => {
            if (data.error) {
                setMessages(prev => [...prev, {
                    id: nextId(), text: data.error, type: 'system'
                }]);
                if (data.expired) onSessionsChanged?.();
                return;
            }

            if (data.disambiguation) {
                const disambiguationSessions = data.sessions || [];
                const sessionNames = disambiguationSessions.map((s: any) => s.recipe).join(', or ');
                const spokenText = data.message + (sessionNames ? ` Your options are: ${sessionNames}.` : '');
                setMessages(prev => [...prev, {
                    id: nextId(),
                    text: data.message,
                    type: 'assistant',
                    modelUsed: data.modelUsed,
                    disambiguation: disambiguationSessions,
                    disambigUserMessage: originalText
                }]);
                voiceOut(spokenText);
                return;
            }

            if (data.recipeDisambiguation) {
                pendingRecipeDisambRef.current = { text: data.pendingText, recipes: data.recipes };
                const recipeNames = (data.recipes || []).map((r: any) => r.title).join(', or ');
                const spokenText = data.message + (recipeNames ? ` Your options are: ${recipeNames}.` : '');
                setMessages(prev => [...prev, {
                    id: nextId(),
                    text: data.message,
                    type: 'assistant',
                    modelUsed: data.modelUsed,
                    recipeDisambiguation: data.recipes
                }]);
                voiceOut(spokenText);
                return;
            }

            if (data.sessionStarted) {
                const rawText = data.message || data.firstStep || 'Starting your recipe.';
                const cleanText = stripTimerTags(rawText);
                const suggestedTimers = data.suggestedTimers?.map((t: any) => ({ ...t, recipe: data.recipe })) || [];

                // In voice mode: auto-accept suggested timers
                if (isVoiceMode && suggestedTimers.length > 0) {
                    suggestedTimers.forEach((t: any) => startTimerWithAnnounce(t, data.sessionId));
                }

                setMessages(prev => [...prev, {
                    id: nextId(),
                    text: cleanText,
                    type: 'assistant',
                    modelUsed: data.modelUsed,
                    recipeName: data.recipe,
                    timerSuggestions: isVoiceMode ? undefined : suggestedTimers,
                    sessionId: data.sessionId
                }]);
                onSessionsChanged?.();
                voiceOut(cleanText);
                return;
            }

            if (data.awaitingEndConfirmation) {
                setMessages(prev => [...prev, {
                    id: nextId(),
                    text: data.message,
                    type: 'assistant',
                    modelUsed: data.modelUsed,
                    awaitingEndConfirmation: true,
                    sessionId: data.sessionId
                }]);
                voiceOut(data.message);
                return;
            }

            if (data.sessionCompleted) {
                setMessages(prev => [...prev, {
                    id: nextId(),
                    text: data.message,
                    type: 'assistant',
                    modelUsed: data.modelUsed
                }]);
                onSessionsChanged?.();
                voiceOut(data.message);
                return;
            }

            // Normal LLM response (or kitchen Q&A)
            const recipeName = data.recipe || (data.kitchenQA ? 'Kitchen Q&A' : null);
            const cleanMessage = stripTimerTags(data.message || '');

            // Handle auto-started timers from backend ([TIMER_START:...] tags)
            if (data.startedTimers?.length > 0) {
                data.startedTimers.forEach((t: any) => {
                    const timer = { ...t, recipe: data.recipe || 'Timer' };
                    onTimerStarted?.(timer);
                    if (isVoiceMode) {
                        voiceOut(`Timer started: ${timer.label} for ${spokenDuration(timer.durationSeconds)}.`);
                    }
                });
            }

            // Handle suggested timers ([TIMER:...] tags)
            const suggestedTimers = data.suggestedTimers?.length > 0
                ? data.suggestedTimers.map((t: any) => ({ ...t, recipe: data.recipe || 'Timer' }))
                : undefined;

            // In voice mode: auto-accept suggested timers
            if (isVoiceMode && suggestedTimers?.length) {
                suggestedTimers.forEach((t: any) => startTimerWithAnnounce(t, data.sessionId));
            }

            setMessages(prev => [...prev, {
                id: nextId(),
                text: cleanMessage,
                type: 'assistant',
                modelUsed: data.modelUsed,
                recipeName,
                timerSuggestions: isVoiceMode ? undefined : suggestedTimers,
                awaitingCompletion: data.awaitingCompletion,
                sessionId: data.sessionId
            }]);
            onSessionsChanged?.();

            // Speak assistant response for voice mode
            voiceOut(cleanMessage);
        }, [onSessionsChanged, onTimerStarted, onAssistantMessage, micState]);

        const handleSendMessage = useCallback(async (overrideText?: string) => {
            const messageText = overrideText || inputValue.trim();
            if (!messageText || !isAuthenticated) return;

            // Show user message
            setMessages(prev => [...prev, {
                id: nextId(), text: messageText, type: 'user'
            }]);
            if (!overrideText) setInputValue('');

            // Check for pending recipe disambiguation resolution (free-text match)
            if (pendingRecipeDisambRef.current && !overrideText) {
                const lower = messageText.toLowerCase();
                const match = pendingRecipeDisambRef.current.recipes.find((r: any) =>
                    r.title.toLowerCase().includes(lower) || lower.includes(r.title.toLowerCase().split(' ')[0])
                );
                if (match) {
                    const pendingText = pendingRecipeDisambRef.current.text;
                    pendingRecipeDisambRef.current = null;
                    await doSend(pendingText, { resolvedRecipeId: match.recipeId });
                    return;
                }
                pendingRecipeDisambRef.current = null;
            }

            await doSend(messageText);
        }, [inputValue, isAuthenticated, doSend]);

        /* ─── Disambiguation chip handlers ────────────────────── */

        // Session chip click: route the original user message directly to the chosen session.
        // Uses Step 4 (explicit sessionId) — no pending DB state needed.
        const handleSessionChip = useCallback(async (sessionId: number, originalText: string) => {
            await doSend(originalText, { sessionId });
        }, [doSend]);

        const handleRecipeChip = useCallback(async (recipeId: number) => {
            if (!pendingRecipeDisambRef.current) return;
            const text = pendingRecipeDisambRef.current.text;
            pendingRecipeDisambRef.current = null;
            await doSend(text, { resolvedRecipeId: recipeId });
        }, [doSend]);

        /* ─── Timer suggestion handler ────────────────────────── */

        const handleAcceptTimer = useCallback(async (
            msgId: string,
            timer: { label: string; durationSeconds: number; recipe: string },
            sessionId?: number
        ) => {
            // Start timer locally immediately
            onTimerStarted?.(timer);
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, timerSuggestions: m.timerSuggestions?.filter(t => t.label !== timer.label) } : m
            ));
            setMessages(prev => [...prev, {
                id: nextId(),
                text: `Timer started: ${timer.label} (${formatTime(timer.durationSeconds)})`,
                type: 'system'
            }]);

            if (!sessionId) return;

            // Persist directly — no LLM call needed for user-confirmed timers.
            // The LLM sees confirmed timers via formatTimerStatus() on the next request.
            try {
                const res = await fetch('/api/cooking/timer/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify({
                        sessionId,
                        label: timer.label,
                        durationSeconds: timer.durationSeconds
                    })
                });
                if (res.ok) {
                    onSessionsChanged?.();
                }
            } catch (e) {
                // Keep local timer running even if persistence call fails.
            }
        }, [onTimerStarted, onSessionsChanged]);

        const handleDismissTimer = useCallback((msgId: string, label: string) => {
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, timerSuggestions: m.timerSuggestions?.filter(t => t.label !== label) } : m
            ));
        }, []);

        /* ─── End session confirmation handlers ───────────────── */

        // User clicked "Yes, end session" on the confirmation prompt
        const handleConfirmEnd = useCallback(async (msgId: string, sessionId: number) => {
            // Dismiss the confirmation message immediately
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, awaitingEndConfirmation: false } : m
            ));
            // Send confirmEnd flag — backend bypasses disambiguation and ends immediately
            await doSend('yes', { confirmEnd: true, sessionId });
        }, [doSend]);

        // User clicked "No, keep cooking" — just dismiss the prompt
        const handleDismissEndConfirmation = useCallback((msgId: string) => {
            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, awaitingEndConfirmation: false } : m
            ));
        }, []);

        /* ─── End session handler ─────────────────────────────── */

        const handleEndSession = useCallback(async (sessionId: number) => {
            try {
                const res = await fetch('/api/cooking/end', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify({ sessionId })
                });
                const data = await res.json();
                if (res.ok) {
                    setMessages(prev => [...prev, {
                        id: nextId(), text: data.message, type: 'system'
                    }]);
                    onSessionsChanged?.();
                }
            } catch (e) {
                // ignore
            }
        }, [onSessionsChanged]);

        /* ─── Imperative handle ───────────────────────────────── */

        useImperativeHandle(ref, () => ({
            sendMessage: (text: string) => {
                handleSendMessage(text);
            }
        }));

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        };

        /* ─── Render ──────────────────────────────────────────── */

        return (
            <div className={styles.chatContainer}>
                <div className={styles.messagesArea}>
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`${styles.messageWrapper} ${styles[msg.type]}`}
                        >
                            {msg.type === 'assistant' && (
                                <div className={styles.aiAvatar}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
                                        <line x1="6" y1="17" x2="18" y2="17" />
                                    </svg>
                                </div>
                            )}

                            <div className={styles.messageBubble}>
                                {msg.recipeName && msg.type === 'assistant' && (
                                    <div className={styles.recipeTag}>{msg.recipeName}</div>
                                )}
                                <div className={styles.messageText}>{msg.text}</div>
                                {msg.modelUsed && (
                                    <div className={styles.modelTag}>{msg.modelUsed}</div>
                                )}

                                {msg.sessionId && msg.type === 'assistant' && !msg.awaitingCompletion && !msg.awaitingEndConfirmation && (
                                    <button
                                        className={styles.endSessionQuickBtn}
                                        onClick={() => doSend('end session', { sessionId: msg.sessionId })}
                                    >
                                        End session
                                    </button>
                                )}

                                {msg.disambiguation && msg.disambiguation.length > 0 && (
                                    <div className={styles.disambigChips}>
                                        {msg.disambiguation.map(s => (
                                            <button key={s.sessionId} className={styles.disambigChip}
                                                onClick={() => handleSessionChip(s.sessionId, msg.disambigUserMessage || '')}>
                                                {s.recipe} ({s.currentStep}/{s.totalSteps})
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {msg.recipeDisambiguation && msg.recipeDisambiguation.length > 0 && (
                                    <div className={styles.disambigChips}>
                                        {msg.recipeDisambiguation.map(r => (
                                            <button key={r.recipeId} className={styles.disambigChip}
                                                onClick={() => handleRecipeChip(r.recipeId)}>
                                                {r.title} ({r.steps} steps)
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {msg.timerSuggestions && msg.timerSuggestions.length > 0 && (
                                    <div className={styles.timerSuggestions}>
                                        {msg.timerSuggestions.map(t => (
                                            <div key={t.label} className={styles.timerSuggestion}>
                                                <span>Start timer: {t.label} ({formatTime(t.durationSeconds)})?</span>
                                                <button className={styles.btnYes}
                                                    onClick={() => handleAcceptTimer(msg.id, t, msg.sessionId)}>Yes</button>
                                                <button className={styles.btnNo}
                                                    onClick={() => handleDismissTimer(msg.id, t.label)}>No</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {msg.awaitingCompletion && msg.sessionId && (
                                    <button className={styles.endSessionBtn}
                                        onClick={() => handleEndSession(msg.sessionId!)}>
                                        Yes, end session
                                    </button>
                                )}

                                {msg.awaitingEndConfirmation && msg.sessionId && (
                                    <div className={styles.endConfirmButtons}>
                                        <button className={styles.endConfirmYes}
                                            onClick={() => handleConfirmEnd(msg.id, msg.sessionId!)}>
                                            Yes, end session
                                        </button>
                                        <button className={styles.endConfirmNo}
                                            onClick={() => handleDismissEndConfirmation(msg.id)}>
                                            No, keep cooking
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className={`${styles.messageWrapper} ${styles.assistant}`}>
                            <div className={styles.aiAvatar}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                            </div>
                            <div className={`${styles.messageBubble} ${styles.loadingBubble}`}>
                                <div className={styles.typingDot}></div>
                                <div className={styles.typingDot}></div>
                                <div className={styles.typingDot}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className={styles.scrollAnchor} />
                </div>

                <div className={styles.inputArea}>
                    {/* Voice status banner — shown when voice mode is active */}
                    {onMicToggle && micState && micState !== 'disabled' && (
                        <div className={`${styles.voiceStatusBanner} ${styles[`voiceBanner_${micState}`]}`}>
                            <span className={styles.voiceStatusDot} />
                            <span className={styles.voiceStatusText}>
                                {micState === 'listening' && '🎙️ Listening — say "Hey Sous" to give a command'}
                                {micState === 'processing' && '⏳ Processing your speech...'}
                                {micState === 'speaking' && '🔊 Speaking response...'}
                                {micState === 'idle' && '🎤 Voice mode on — waiting for wake word'}
                                {micState === 'error' && '❌ Microphone error — check permissions'}
                            </span>
                        </div>
                    )}
                    <div className={`${styles.inputContainer} ${micState && micState !== 'disabled' ? styles[`inputVoice_${micState}`] : ''}`}>
                        <textarea
                            className={styles.autoResizingTextarea}
                            placeholder="Try: 'cook chicken parmesan' or 'end session'"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={!isAuthenticated || isLoading}
                            rows={1}
                        />
                        {onMicToggle && (
                            <button
                                className={`${styles.micBtn} ${micState ? styles[micState] : ''}`}
                                onClick={onMicToggle}
                                disabled={!isAuthenticated}
                                aria-label={micState === 'disabled' || micState === 'idle' ? 'Enable voice mode' : 'Disable voice mode'}
                                title={micState === 'disabled' || micState === 'idle' ? 'Click to enable voice mode' : 'Click to disable voice mode'}
                            >
                                {micState === 'processing' ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.spinnerIcon}>
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                ) : micState === 'speaking' ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="9" width="4" height="6" rx="1" />
                                        <rect x="10" y="5" width="4" height="14" rx="1" />
                                        <rect x="18" y="7" width="4" height="10" rx="1" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="23" />
                                        <line x1="8" y1="23" x2="16" y2="23" />
                                    </svg>
                                )}
                            </button>
                        )}
                        <button
                            className={`${styles.sendBtn} ${inputValue.trim() ? styles.active : ''}`}
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || !isAuthenticated || isLoading}
                            aria-label="Send message"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                    <div className={styles.inputDisclaimer}>
                        SousChef can make mistakes. Check important temperatures and allergies.
                    </div>
                </div>
            </div>
        );
    });

/* ─── Utilities ────────────────────────────────────────────── */

function formatTime(totalSecs: number): string {
    if (totalSecs <= 0) return 'DONE';
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    if (m > 0) return m + ':' + String(s).padStart(2, '0');
    return s + 's';
}

export default ChatInterface;
