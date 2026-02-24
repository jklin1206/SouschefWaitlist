'use client';

import React from 'react';
import styles from './ContextStrip.module.css';
import { motion, AnimatePresence } from 'framer-motion';

interface Session {
    sessionId: string;
    recipe: string;
    currentStep: number;
    totalSteps: number;
}

interface ContextStripProps {
    activeSessions: Session[];
}

export default function ContextStrip({ activeSessions }: ContextStripProps) {
    if (activeSessions.length === 0) return null;

    return (
        <div className={styles.strip}>
            <div className={styles.label}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Active
            </div>
            <div className={styles.chips}>
                <AnimatePresence>
                    {activeSessions.map(session => (
                        <motion.div
                            key={session.sessionId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className={styles.chip}
                        >
                            <span className={styles.dot} />
                            <span className={styles.recipeName}>{session.recipe}</span>
                            <span className={styles.step}>{session.currentStep}/{session.totalSteps}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
