'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './TimerBar.module.css';

export interface Timer {
    id: string;
    label: string;
    durationSeconds: number;
    startedAt: number;
    recipe: string;
    notified?: boolean;
}

interface TimerBarProps {
    timers: Timer[];
    onTimerComplete?: (timer: Timer) => void;
    onDismissTimer?: (id: string) => void;
}

export default function TimerBar({ timers, onTimerComplete, onDismissTimer }: TimerBarProps) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (timers.length === 0) return;
        const interval = setInterval(() => {
            setNow(Date.now());
            timers.forEach(t => {
                const elapsed = Math.floor((Date.now() - t.startedAt) / 1000);
                const remaining = Math.max(0, t.durationSeconds - elapsed);
                if (remaining === 0 && !t.notified && onTimerComplete) {
                    t.notified = true;
                    onTimerComplete(t);
                }
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timers, onTimerComplete]);

    const formatTime = (totalSecs: number) => {
        if (totalSecs <= 0) return 'DONE';
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    if (timers.length === 0) return null;

    return (
        <div className={styles.bar}>
            <div className={styles.label}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
                Timers
            </div>
            <div className={styles.list}>
                <AnimatePresence>
                    {timers.map(t => {
                        const elapsed = Math.floor((now - t.startedAt) / 1000);
                        const remaining = Math.max(0, t.durationSeconds - elapsed);
                        const isDone = remaining <= 0;
                        const progress = Math.min(1, elapsed / t.durationSeconds);

                        return (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`${styles.timer} ${isDone ? styles.done : ''}`}
                            >
                                <div className={styles.progressTrack}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${progress * 100}%` }}
                                    />
                                </div>
                                <div className={styles.timerContent}>
                                    <span className={styles.timerRecipe}>{t.recipe}</span>
                                    <span className={styles.timerLabel}>{t.label}</span>
                                    <span className={styles.timerTime}>{formatTime(remaining)}</span>
                                    {isDone && onDismissTimer && (
                                        <button
                                            className={styles.dismissBtn}
                                            onClick={() => onDismissTimer(t.id)}
                                            aria-label="Dismiss timer"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
