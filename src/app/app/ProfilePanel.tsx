'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ProfilePanel.module.css';

const DIET_OPTIONS = [
    'Vegan',
    'Vegetarian',
    'Pescatarian',
    'Halal',
    'Kosher',
    'Gluten-Free',
    'Dairy-Free',
    'Lactose Intolerant',
    'Nut-Free',
    'Keto',
    'Paleo',
    'Low-Sodium',
    'Low-Carb',
    'Diabetic-Friendly',
    'Low-FODMAP',
];

interface UserPreferences {
    allergies?: string[];
    dietaryRestrictions?: string[];
    dislikedIngredients?: string[];
}

interface ProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
    token: string | null;
}

export default function ProfilePanel({ isOpen, onClose, token }: ProfilePanelProps) {
    const [allergies, setAllergies] = useState<string[]>([]);
    const [dietary, setDietary] = useState<string[]>([]);
    const [dislikes, setDislikes] = useState<string[]>([]);

    const [allergyInput, setAllergyInput] = useState('');
    const [dislikeInput, setDislikeInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && token) {
            loadPreferences();
        }
    }, [isOpen, token]);

    const loadPreferences = async () => {
        try {
            const res = await fetch('/api/user/profile', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            if (res.ok) {
                const data: UserPreferences = await res.json();
                setAllergies(data.allergies || []);
                setDietary(data.dietaryRestrictions || []);
                setDislikes(data.dislikedIngredients || []);
            }
        } catch (e) {
            console.error('Failed to load preferences', e);
        }
    };

    const savePreferences = async () => {
        if (!token) return;
        setIsSaving(true);
        try {
            const prefs: UserPreferences = {
                allergies,
                dietaryRestrictions: dietary,
                dislikedIngredients: dislikes
            };

            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(prefs)
            });
            if (res.ok) {
                onClose();
            } else {
                console.error('Failed to save preferences');
            }
        } catch (e) {
            console.error('Save failed', e);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleDiet = (diet: string) => {
        const normalized = diet.toLowerCase();
        setDietary(prev =>
            prev.includes(normalized)
                ? prev.filter(d => d !== normalized)
                : [...prev, normalized]
        );
    };

    const handleTagKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        inputVal: string,
        setInput: React.Dispatch<React.SetStateAction<string>>,
        list: string[],
        setList: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        if (e.key === 'Enter' && inputVal.trim()) {
            e.preventDefault();
            const val = inputVal.trim().toLowerCase();
            if (!list.includes(val)) {
                setList([...list, val]);
            }
            setInput('');
        } else if (e.key === 'Backspace' && !inputVal && list.length > 0) {
            setList(list.slice(0, -1));
        }
    };

    const removeTag = (
        tagToRemove: string,
        list: string[],
        setList: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setList(list.filter(t => t !== tagToRemove));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={styles.profileOverlay}
                >
                    <motion.div
                        initial={{ y: 20, scale: 0.95 }}
                        animate={{ y: 0, scale: 1 }}
                        exit={{ y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={styles.profilePanel}
                    >
                        <div className={styles.profileTitle}>Preferences</div>

                        {/* ── Dietary Restrictions — selectable pills ── */}
                        <div className={styles.profileField}>
                            <div className={styles.profileLabel}>Dietary Restrictions</div>
                            <div className={styles.dietGrid}>
                                {DIET_OPTIONS.map(diet => {
                                    const active = dietary.includes(diet.toLowerCase());
                                    return (
                                        <button
                                            key={diet}
                                            className={`${styles.dietPill} ${active ? styles.dietPillActive : ''}`}
                                            onClick={() => toggleDiet(diet)}
                                            type="button"
                                        >
                                            {diet}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Allergies — free-form tags ── */}
                        <div className={styles.profileField}>
                            <div className={styles.profileLabel}>Allergies</div>
                            <div className={styles.tagContainer}>
                                {allergies.map(tag => (
                                    <span key={tag} className={`${styles.tag} ${styles.allergy}`}>
                                        {tag} <button className={styles.tagRemove} onClick={() => removeTag(tag, allergies, setAllergies)}>×</button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    className={styles.tagInput}
                                    placeholder="e.g. peanuts, shellfish..."
                                    value={allergyInput}
                                    onChange={e => setAllergyInput(e.target.value)}
                                    onKeyDown={e => handleTagKeyDown(e, allergyInput, setAllergyInput, allergies, setAllergies)}
                                />
                            </div>
                        </div>

                        {/* ── Disliked Ingredients — free-form tags ── */}
                        <div className={styles.profileField}>
                            <div className={styles.profileLabel}>Disliked Ingredients</div>
                            <div className={styles.tagContainer}>
                                {dislikes.map(tag => (
                                    <span key={tag} className={`${styles.tag} ${styles.dislike}`}>
                                        {tag} <button className={styles.tagRemove} onClick={() => removeTag(tag, dislikes, setDislikes)}>×</button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    className={styles.tagInput}
                                    placeholder="e.g. cilantro, olives..."
                                    value={dislikeInput}
                                    onChange={e => setDislikeInput(e.target.value)}
                                    onKeyDown={e => handleTagKeyDown(e, dislikeInput, setDislikeInput, dislikes, setDislikes)}
                                />
                            </div>
                        </div>

                        <div className={styles.profileActions}>
                            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
                            <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={savePreferences}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
