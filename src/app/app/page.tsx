'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './App.module.css';
import AuthOverlay from './AuthOverlay';
import ChatInterface, { ChatInterfaceHandle } from './ChatInterface';
import RecipeGrid from './RecipeGrid';
import ContextStrip from './ContextStrip';
import TimerBar, { Timer } from './TimerBar';
import ProfilePanel from './ProfilePanel';
import useVoiceController from './useVoiceController';
import { motion, AnimatePresence } from 'framer-motion';

function toEpochMs(startedAt: unknown): number {
    if (typeof startedAt === 'number') return startedAt;

    if (Array.isArray(startedAt) && startedAt.length >= 6) {
        const [y, mo, d, h, mi, s, n] = startedAt as number[];
        const millis = n ? Math.floor(n / 1_000_000) : 0;
        return new Date(y, mo - 1, d, h, mi, s, millis).getTime();
    }

    if (typeof startedAt === 'string') {
        const normalized = startedAt.includes('T') ? startedAt : startedAt.replace(' ', 'T');
        const parsed = Date.parse(normalized);
        if (!Number.isNaN(parsed)) return parsed;
    }

    return Date.now();
}

export default function AppPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [activeTimers, setActiveTimers] = useState<Timer[]>([]);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const chatRef = useRef<ChatInterfaceHandle>(null);

    // Voice controller
    const voiceController = useVoiceController({
        sendMessage: (text: string, extraBody?: Record<string, any>) => {
            if (chatRef.current) chatRef.current.sendMessage(text);
        },
        isAuthenticated,
    });

    // Timer completion — announce via voice
    const handleTimerComplete = useCallback((timer: Timer) => {
        voiceController.speakText(`${timer.label} timer is done!`);
    }, [voiceController]);

    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUsername = localStorage.getItem('username');
        if (token && storedUsername) {
            setIsAuthenticated(true);
            setUsername(storedUsername);
            loadData();
        }

        // Auto-collapse sidebar on smaller screens
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadData = async () => {
        await loadRecipes();
        await loadSessions();
    };

    const loadSessions = async () => {
        try {
            const res = await fetch('/api/cooking/sessions', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                }
            });
            if (res.ok) {
                const data = await res.json();
                setActiveSessions(data);

                const hydratedTimers: Timer[] = data.flatMap((session: any) =>
                    (session.activeTimers || []).map((t: any) => ({
                        id: String(t.id ?? `${session.sessionId}-${t.label}-${t.startedAt}`),
                        label: t.label,
                        durationSeconds: t.durationSeconds,
                        startedAt: toEpochMs(t.startedAt),
                        recipe: session.recipe
                    }))
                );

                setActiveTimers(hydratedTimers);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadRecipes = async () => {
        try {
            const res = await fetch('/api/cooking/recipes', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                }
            });
            if (res.ok) {
                const data = await res.json();
                setRecipes(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleImportRecipe = async (url: string) => {
        try {
            const res = await fetch('/api/recipes/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                },
                body: JSON.stringify({ url })
            });
            if (res.ok) {
                await loadRecipes();
            }
        } catch (e) {
            console.error("Failed to import", e);
        }
    };

    const handleDeleteRecipe = async (id: string) => {
        try {
            const res = await fetch(`/api/recipes/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                }
            });
            if (res.ok) {
                await loadRecipes();
            }
        } catch (e) {
            console.error('Failed to delete recipe', e);
        }
    };

    const handleSelectRecipe = (recipe: any) => {
        // Send "cook [recipe title]" into the chat to start a session
        if (chatRef.current) {
            chatRef.current.sendMessage('cook ' + recipe.title);
        }
    };

    const handleAuthSuccess = (token: string, newUsername: string) => {
        localStorage.setItem('token', token);
        localStorage.setItem('username', newUsername);
        setIsAuthenticated(true);
        setUsername(newUsername);
        loadData();
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setIsAuthenticated(false);
        setUsername(null);
        setRecipes([]);
        setActiveSessions([]);
        setActiveTimers([]);
    };

    // Callback when ChatInterface starts/ends sessions
    const handleSessionsChanged = useCallback(() => {
        loadSessions();
    }, []);

    // Callback when ChatInterface starts a timer
    const handleTimerStarted = useCallback((timer: { label: string; durationSeconds: number; recipe: string }) => {
        setActiveTimers(prev => [...prev, {
            id: Date.now().toString() + Math.random(),
            label: timer.label,
            durationSeconds: timer.durationSeconds,
            startedAt: Date.now(),
            recipe: timer.recipe
        }]);
    }, []);

    // Dismiss a completed timer from the UI
    const handleDismissTimer = useCallback((id: string) => {
        setActiveTimers(prev => prev.filter(t => t.id !== id));
        // Persist completion for DB-backed timers so they don't reappear on refresh.
        if (/^\d+$/.test(id)) {
            void fetch('/api/cooking/timer/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                },
                body: JSON.stringify({ timerId: Number(id) })
            }).then(() => loadSessions()).catch(() => {
                // local dismiss remains even if persistence fails
            });
        }
    }, []);

    return (
        <main className={styles.appLayout}>
            {!isAuthenticated && <AuthOverlay onAuthSuccess={handleAuthSuccess} />}

            {/* Floating Top Nav within App Layout (mobile only or collapsed state) */}
            <div className={styles.topNav}>
                <button
                    className={styles.menuToggle}
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    aria-label="Toggle Sidebar"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <div className={styles.navLogo}>SousChef</div>
                <div className={styles.navSpacer}></div>
                {isAuthenticated && (
                    <button className={styles.avatarBtn} onClick={() => setIsProfileOpen(true)}>
                        {username?.slice(0, 2).toUpperCase() || '?'}
                    </button>
                )}
            </div>

            <div className={styles.dashboard}>
                {/* Left Sidebar */}
                <AnimatePresence initial={false}>
                    {isSidebarOpen && isAuthenticated && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0, x: -50 }}
                            animate={{ width: 340, opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: -50 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className={styles.sidebar}
                        >
                            <div className={styles.sidebarHeader}>
                                <div className={styles.sidebarLogo}>SousChef</div>
                                <button className={styles.iconBtn} onClick={() => setIsSidebarOpen(false)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <div className={styles.sidebarContent}>
                                <RecipeGrid
                                    recipes={recipes}
                                    onSelectRecipe={handleSelectRecipe}
                                    onImportRecipe={handleImportRecipe}
                                    onDeleteRecipe={handleDeleteRecipe}
                                />
                            </div>

                            <div className={styles.sidebarFooter}>
                                <div className={styles.userProfileRow} onClick={() => setIsProfileOpen(true)}>
                                    <div className={styles.avatarSmall}>
                                        {username?.slice(0, 2).toUpperCase() || '?'}
                                    </div>
                                    <div className={styles.userName}>@{username}</div>
                                    <div className={styles.userIcon}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="3"></circle>
                                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                        </svg>
                                    </div>
                                </div>
                                <button className={styles.logoutBtn} onClick={handleLogout}>
                                    Sign Out
                                </button>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <div className={styles.mainArea}>
                    {/* Sidebar reopen toggle */}
                    {!isSidebarOpen && isAuthenticated && (
                        <button
                            className={styles.sidebarOpenBtn}
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open sidebar"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                            </svg>
                        </button>
                    )}

                    {/* Session status bar */}
                    <ContextStrip activeSessions={activeSessions} />

                    {/* Chat + Timer panel side by side */}
                    <div className={styles.contentRow}>
                        <div className={styles.chatWrapper}>
                            {isAuthenticated ? (
                                <ChatInterface
                                    ref={chatRef}
                                    isAuthenticated={isAuthenticated}
                                    onSessionsChanged={handleSessionsChanged}
                                    onTimerStarted={handleTimerStarted}
                                    onAssistantMessage={voiceController.isMicEnabled ? voiceController.speakText : undefined}
                                    micState={voiceController.micState}
                                    onMicToggle={voiceController.toggleMic}
                                />
                            ) : (
                                <div className={styles.loginPrompt}>
                                    Please login to access your kitchen assistant.
                                </div>
                            )}
                        </div>

                        {/* Right-side timer panel — only shows when timers exist */}
                        {activeTimers.length > 0 && (
                            <div className={styles.timerPanel}>
                                <TimerBar timers={activeTimers} onDismissTimer={handleDismissTimer} onTimerComplete={handleTimerComplete} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ProfilePanel
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                token={isAuthenticated ? localStorage.getItem('token') : null}
            />
        </main>
    );
}
