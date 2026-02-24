'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/* ─── Types ──────────────────────────────────────────────── */

export type MicState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'disabled';

export interface VoiceControllerOptions {
    sendMessage: (text: string, extraBody?: Record<string, any>) => void;
    isAuthenticated: boolean;
}

export interface VoiceController {
    micState: MicState;
    isMicEnabled: boolean;
    toggleMic: () => void;
    speakText: (text: string) => void;
}

/* ─── Constants ──────────────────────────────────────────── */

const WAKE_PHRASES = ['hey sous', 'hey sue', 'hey souz', 'hey soos'];
const FOLLOW_UP_TIMEOUT_MS = 6000;

/* ─── SpeechRecognition type shim (Chrome prefixed) ────── */

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : any;

function getSpeechRecognition(): SpeechRecognitionType | null {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/* ─── Hook ───────────────────────────────────────────────── */

export default function useVoiceController({
    sendMessage,
    isAuthenticated,
}: VoiceControllerOptions): VoiceController {
    const [micState, setMicState] = useState<MicState>('disabled');
    const [isMicEnabled, setIsMicEnabled] = useState(false);

    // Refs for mutable state that shouldn't trigger re-renders
    const recognitionRef = useRef<any>(null);
    const followUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFollowUpRef = useRef(false);
    const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
    const isSpeakingRef = useRef(false);
    const sendMessageRef = useRef(sendMessage);
    const isMicEnabledRef = useRef(false);

    // Keep refs current
    useEffect(() => {
        sendMessageRef.current = sendMessage;
    }, [sendMessage]);

    useEffect(() => {
        isMicEnabledRef.current = isMicEnabled;
    }, [isMicEnabled]);

    // Select the best voice on mount
    useEffect(() => {
        const pickVoice = () => {
            const voices = speechSynthesis.getVoices();
            const preferred = voices.find(
                (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')
            );
            const english = voices.find((v) => v.lang.startsWith('en-US'));
            selectedVoiceRef.current = preferred || english || voices[0] || null;
        };

        pickVoice();
        speechSynthesis.addEventListener('voiceschanged', pickVoice);
        return () => speechSynthesis.removeEventListener('voiceschanged', pickVoice);
    }, []);

    /* ─── Wake word detection ────────────────────────────── */

    const extractCommand = useCallback((transcript: string): string | null => {
        const lower = transcript.toLowerCase();
        for (const phrase of WAKE_PHRASES) {
            const idx = lower.indexOf(phrase);
            if (idx !== -1) return transcript.slice(idx + phrase.length).trim();
        }
        return null;
    }, []);

    /* ─── TTS: sentence-streaming ────────────────────────── */

    const speakText = useCallback((text: string) => {
        if (!text || typeof window === 'undefined') return;

        speechSynthesis.cancel();
        isSpeakingRef.current = true;
        setMicState('speaking');

        // Keep recognition running during TTS so the user can say
        // "Hey Sous" to interrupt — the onresult handler will cancel speech.

        const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) ?? [text];
        let i = 0;

        const onDone = () => {
            isSpeakingRef.current = false;
            if (isMicEnabledRef.current) {
                setMicState('idle');
            }
        };

        const next = () => {
            if (i >= sentences.length) {
                onDone();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(sentences[i++].trim());
            if (selectedVoiceRef.current) {
                utterance.voice = selectedVoiceRef.current;
            }
            utterance.rate = 1.05;
            utterance.onend = next;
            utterance.onerror = onDone;
            speechSynthesis.speak(utterance);
        };

        next();
    }, []);

    /* ─── SpeechRecognition lifecycle ────────────────────── */

    const stopRecognition = useCallback(() => {
        if (followUpTimerRef.current) {
            clearTimeout(followUpTimerRef.current);
            followUpTimerRef.current = null;
        }
        isFollowUpRef.current = false;
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (_) { /* ignore */ }
            recognitionRef.current = null;
        }
    }, []);

    const startRecognition = useCallback(() => {
        const SpeechRecognition = getSpeechRecognition();
        if (!SpeechRecognition) {
            console.error('SpeechRecognition API not available. Use Chrome.');
            setMicState('error');
            setIsMicEnabled(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;   // needed for wake-word interruption during TTS
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
            const lastResult = event.results[event.results.length - 1];
            const transcript = lastResult[0].transcript.trim();
            if (!transcript) return;

            // ── Interim results: only used to interrupt TTS on wake word ──
            if (!lastResult.isFinal) {
                if (isSpeakingRef.current && extractCommand(transcript) !== null) {
                    console.log('[Voice] Wake word in interim — interrupting TTS');
                    speechSynthesis.cancel();
                    isSpeakingRef.current = false;
                    setMicState('listening');
                }
                return;
            }

            // ── Final result from here on ──
            console.log('[Voice] Heard:', transcript);

            // ── Follow-up listening mode (wake word already said) ──
            if (isFollowUpRef.current) {
                isFollowUpRef.current = false;
                if (followUpTimerRef.current) {
                    clearTimeout(followUpTimerRef.current);
                    followUpTimerRef.current = null;
                }
                setMicState('processing');
                sendMessageRef.current(transcript);
                return;
            }

            // ── Normal mode: check for wake word ──
            const command = extractCommand(transcript);
            if (command === null) {
                // No wake word — discard
                return;
            }

            // Interrupt any ongoing TTS
            if (isSpeakingRef.current) {
                speechSynthesis.cancel();
                isSpeakingRef.current = false;
            }

            if (command.length > 0) {
                // Wake word + command in same utterance
                setMicState('processing');
                sendMessageRef.current(command);
            } else {
                // Wake word only — open follow-up window
                setMicState('listening');
                isFollowUpRef.current = true;
                followUpTimerRef.current = setTimeout(() => {
                    isFollowUpRef.current = false;
                    setMicState('idle');
                }, FOLLOW_UP_TIMEOUT_MS);
            }
        };

        recognition.onerror = (event: any) => {
            console.warn('[Voice] Recognition error:', event.error);
            // 'no-speech' and 'aborted' are normal — just keep going
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            setMicState('error');
        };

        recognition.onend = () => {
            // Auto-restart if mic is still enabled and we're not speaking
            if (isMicEnabledRef.current && !isSpeakingRef.current) {
                try { recognition.start(); } catch (_) { /* ignore */ }
            }
        };

        try {
            recognition.start();
            setMicState('idle');
        } catch (e) {
            console.error('[Voice] Failed to start recognition:', e);
            setMicState('error');
            setIsMicEnabled(false);
        }
    }, [extractCommand]);

    /* ─── Toggle mic ─────────────────────────────────────── */

    const toggleMic = useCallback(() => {
        if (!isAuthenticated) return;

        if (isMicEnabled) {
            // Turning off
            speechSynthesis.cancel();
            isSpeakingRef.current = false;
            stopRecognition();
            setIsMicEnabled(false);
            setMicState('disabled');
        } else {
            // Turning on
            setIsMicEnabled(true);
            startRecognition();
        }
    }, [isAuthenticated, isMicEnabled, startRecognition, stopRecognition]);

    /* ─── Cleanup on unmount ─────────────────────────────── */

    useEffect(() => {
        return () => {
            speechSynthesis.cancel();
            stopRecognition();
        };
    }, [stopRecognition]);

    return {
        micState,
        isMicEnabled,
        toggleMic,
        speakText,
    };
}
