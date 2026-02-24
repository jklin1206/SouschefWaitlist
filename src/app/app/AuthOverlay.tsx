'use client';

import React, { useState } from 'react';
import styles from './AuthOverlay.module.css';

interface AuthOverlayProps {
    onAuthSuccess: (token: string, username: string) => void;
}

export default function AuthOverlay({ onAuthSuccess }: AuthOverlayProps) {
    const [tab, setTab] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const submitLogin = async () => {
        setError('');
        if (!username || !password) {
            setError('Username and password required.');
            return;
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Login failed.');
                return;
            }
            onAuthSuccess(data.token, data.username);
        } catch (e) {
            setError('Could not connect to server.');
        }
    };

    const submitRegister = async () => {
        setError('');
        if (!username || !email || !password) {
            setError('All fields required.');
            return;
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Registration failed.');
                return;
            }
            onAuthSuccess(data.token, data.username);
        } catch (e) {
            setError('Could not connect to server.');
        }
    };

    const loginWithGoogle = () => {
        window.location.href = '/oauth2/authorization/google';
    };

    return (
        <div className={styles.authOverlay}>
            <div className={styles.authBox}>
                <div className={styles.authBoxLogo}>SousChef</div>
                <div className={styles.authBoxSub}>Your hands-free kitchen assistant</div>

                <div className={styles.authTabs}>
                    <div
                        className={`${styles.authTab} ${tab === 'login' ? styles.active : ''}`}
                        onClick={() => setTab('login')}
                    >
                        Login
                    </div>
                    <div
                        className={`${styles.authTab} ${tab === 'register' ? styles.active : ''}`}
                        onClick={() => setTab('register')}
                    >
                        Register
                    </div>
                </div>

                {tab === 'login' ? (
                    <div className={styles.authForm}>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
                        />
                        <div className={styles.authError}>{error}</div>
                        <button className={styles.btnSubmit} onClick={submitLogin}>Sign in</button>
                    </div>
                ) : (
                    <div className={styles.authForm}>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitRegister()}
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitRegister()}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitRegister()}
                        />
                        <div className={styles.authError}>{error}</div>
                        <button className={styles.btnSubmit} onClick={submitRegister}>Create account</button>
                    </div>
                )}

                <div className={styles.authDivider}>or</div>
                <button className={styles.btnGoogle} onClick={loginWithGoogle}>
                    <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                        <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.9 3 4 11.9 4 23s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.2-2.7-.5-4z" fill="#FFC107" />
                        <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.7 0-14.4 4.4-17.7 11.7z" fill="#FF3D00" />
                        <path d="M24 43c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.8 34.4 27.1 35 24 35c-6.1 0-11.2-4.1-12.9-9.6l-7 5.4C7.5 38.4 15.2 43 24 43z" fill="#4CAF50" />
                        <path d="M44.5 20H24v8.5h11.8c-.8 2.6-2.5 4.7-4.7 6.1l6.6 5.4C41.8 36.6 45 30.4 45 23c0-1.3-.2-2.7-.5-4z" fill="#1976D2" />
                    </svg>
                    Continue with Google
                </button>
            </div>
        </div>
    );
}
