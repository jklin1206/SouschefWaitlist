'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './RecipeGrid.module.css';

interface Recipe {
    id: string;
    title: string;
    cuisine?: string;
    steps: number;
    imageUrl?: string;
}

interface RecipeGridProps {
    recipes: Recipe[];
    onSelectRecipe: (recipe: Recipe) => void;
    onImportRecipe: (url: string) => void;
    onDeleteRecipe: (id: string) => void;
}

export default function RecipeGrid({ recipes, onSelectRecipe, onImportRecipe, onDeleteRecipe }: RecipeGridProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const filteredRecipes = recipes.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.cuisine && r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleImport = async () => {
        if (!importUrl.trim()) return;
        setIsImporting(true);
        await onImportRecipe(importUrl);
        setImportUrl('');
        setIsImporting(false);
    };

    return (
        <div className={styles.libraryContainer}>
            <div className={styles.libraryHeader}>
                <div className={styles.headerTitle}>Your Kitchen</div>

                <div className={styles.searchBar}>
                    <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search recipes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
            </div>

            <div className={styles.recipeList}>
                <AnimatePresence>
                    {filteredRecipes.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={styles.emptyState}
                        >
                            No recipes found. Import one below!
                        </motion.div>
                    ) : (
                        filteredRecipes.map((recipe, index) => (
                            <motion.div
                                key={recipe.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                className={styles.recipeCard}
                                onClick={() => onSelectRecipe(recipe)}
                            >
                                <div
                                    className={styles.cardImage}
                                    style={{
                                        backgroundImage: `url(${recipe.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%232a2215'/%3E%3C/svg%3E"})`
                                    }}
                                />
                                <div className={styles.cardContent}>
                                    <div className={styles.cardTitle}>{recipe.title}</div>
                                    <div className={styles.cardMeta}>
                                        {recipe.cuisine || 'Recipe'} • {recipe.steps} steps
                                    </div>
                                </div>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={(e) => { e.stopPropagation(); onDeleteRecipe(recipe.id); }}
                                    aria-label="Delete recipe"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <div className={styles.importSection}>
                <div className={styles.importLabel}>Import New Recipe</div>
                <div className={styles.importRow}>
                    <input
                        type="text"
                        placeholder="Paste URL (e.g. NYT, Serious Eats)"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        className={styles.importInput}
                        onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                    />
                    <button
                        className={styles.importBtn}
                        onClick={handleImport}
                        disabled={isImporting || !importUrl.trim()}
                    >
                        {isImporting ? (
                            <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                            </svg>
                        ) : '+'}
                    </button>
                </div>
            </div>
        </div>
    );
}
