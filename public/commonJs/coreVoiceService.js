// ========== ЯДРО ОЗВУЧКИ ==========
const VoiceCore = (function() {
    // Конфигурация
    const API_URL = '/api/tts';

    // Состояние
    let isSpeaking = false;
    let currentAudio = null;
    let audioContext = null;
    let currentUtterance = null;
    let currentGameId = null; // ID игры, которой принадлежит текущая озвучка

    // Очередь озвучки
    let speechQueue = [];
    let isProcessingQueue = false;
    let onQueueCompleteCallback = null;

    // Кэш для уже загруженных аудио
    const audioCache = new Map();

    // Определяем тип браузера и доступные API
    const browserInfo = {
        isYandexBrowser: /YaBrowser/i.test(navigator.userAgent),
        hasYandexSpeaker: !!(window.external && window.external.GetSpeaker),
        hasSpeechSynthesis: !!window.speechSynthesis,
        hasWebAudio: !!(window.AudioContext || window.webkitAudioContext)
    };

    console.log('VoiceCore browser info:', browserInfo);

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

    function getVoiceState() {
        const saved = localStorage.getItem('voiceEnabled');
        return saved !== null ? saved === 'true' : true;
    }

    function setVoiceState(enabled) {
        localStorage.setItem('voiceEnabled', enabled);
    }

    function isVoiceEnabled() {
        return getVoiceState();
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ==========

    function init() {
        if (browserInfo.isYandexBrowser) {
            console.log('🎤 Яндекс.Браузер detected, using built-in Alice');
        }

        document.addEventListener('click', initAudioContext, { once: true });
        document.addEventListener('touchstart', initAudioContext, { once: true });
    }

    function initAudioContext() {
        if (!audioContext && browserInfo.hasWebAudio) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            } catch (e) {
                console.error('Failed to initialize AudioContext:', e);
            }
        }
    }

    // ========== УПРАВЛЕНИЕ ОЧЕРЕДЬЮ ==========

    function queueSpeech(text, options = {}) {
        if (!isVoiceEnabled() && !options.force) {
            if (options.onEnd) setTimeout(options.onEnd, 10);
            return false;
        }

        speechQueue.push({
            text,
            options: {
                ...options,
                gameId: options.gameId || 'unknown',
                timestamp: Date.now()
            }
        });

        if (!isProcessingQueue) {
            processQueue();
        }

        return true;
    }

    function processQueue() {
        if (isProcessingQueue || speechQueue.length === 0) {
            if (speechQueue.length === 0 && onQueueCompleteCallback) {
                const callback = onQueueCompleteCallback;
                onQueueCompleteCallback = null;
                setTimeout(callback, 100);
            }
            return;
        }

        isProcessingQueue = true;
        const next = speechQueue.shift();

        stopCurrentSpeech();

        setTimeout(() => {
            trySpeak(next.text, {
                ...next.options,
                onEnd: () => {
                    console.log(`Speech ended for game: ${next.options.gameId}`);
                    isProcessingQueue = false;
                    if (next.options.onEnd) next.options.onEnd();
                    processQueue();
                },
                onError: (error) => {
                    console.warn('Speech error (handled):', error?.error || error);
                    isProcessingQueue = false;
                    if (next.options.onError) next.options.onError(error);
                    if (next.options.onEnd) next.options.onEnd();
                    processQueue();
                }
            });
        }, 50);
    }

    function stopCurrentSpeech() {
        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {
                console.warn('Error canceling speech:', e);
            }
        }

        if (currentAudio) {
            try {
                if (currentAudio.stop && typeof currentAudio.stop === 'function') {
                    currentAudio.stop();
                } else if (currentAudio.pause) {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                }
            } catch (e) {
                console.warn('Error stopping audio:', e);
            }
            currentAudio = null;
        }

        if (audioContext && audioContext.state !== 'closed') {
            try {
                audioContext.close().catch(console.warn);
            } catch (e) {
                console.warn('Error closing AudioContext:', e);
            }
            audioContext = null;
        }

        isSpeaking = false;
        currentGameId = null;
    }

    function stopSpeaking(gameId) {
        if (gameId) {
            // Останавливаем только если текущая озвучка принадлежит этой игре
            if (isSpeaking && currentGameId === gameId) {
                stopCurrentSpeech();
            }
            // Очищаем очередь для этой игры
            clearQueueForGame(gameId);
        } else {
            // Полная остановка
            stopCurrentSpeech();
            speechQueue = [];
            isProcessingQueue = false;
            onQueueCompleteCallback = null;
        }
    }

    function clearQueueForGame(gameId) {
        const beforeCount = speechQueue.length;
        speechQueue = speechQueue.filter(item => item.options.gameId !== gameId);
        if (beforeCount !== speechQueue.length) {
            console.log(`Cleared ${beforeCount - speechQueue.length} items for game ${gameId}`);
        }
    }

    // ========== API ДЛЯ ЯНДЕКС.БРАУЗЕРА ==========

    function trySpeak(text, options) {
        if (isBuiltInAliceAvailable()) {
            if (speakWithBuiltInAlice(text, options)) {
                return;
            }
        }

        speakWithCloudAPI(text, options);
    }

    function speakWithBuiltInAlice(text, options = {}) {
        if (!browserInfo.hasYandexSpeaker) {
            return false;
        }

        try {
            if (options.onStart) options.onStart();

            currentGameId = options.gameId || null;

            const speaker = window.external.GetSpeaker();
            speaker.Rate = options.rate || 1.0;
            speaker.Volume = options.volume || 100;
            speaker.Voice = 'Alice';
            speaker.Speak(text);

            isSpeaking = true;

            const wordCount = text.split(' ').length;
            const duration = Math.max(1000, wordCount * 400);

            setTimeout(() => {
                isSpeaking = false;
                currentGameId = null;
                if (options.onEnd) options.onEnd();
            }, duration);

            return true;
        } catch (e) {
            console.error('Failed to use built-in Alice:', e);
            return false;
        }
    }

    function isBuiltInAliceAvailable() {
        return browserInfo.isYandexBrowser && browserInfo.hasYandexSpeaker;
    }

    // ========== ОБЛАЧНОЕ API ==========

    function speakWithCloudAPI(text, options) {
        stopCurrentSpeech();

        if (options.onStart) options.onStart();
        currentGameId = options.gameId || null;

        if (audioCache.has(text)) {
            console.log('Using cached audio for:', text.substring(0, 30));
            playAudioData(audioCache.get(text), options);
            return;
        }

        console.log('Requesting TTS from server:', text.substring(0, 30));

        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                voice: 'alena',
                emotion: 'good',
                speed: options.rate || 1.0
            })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || `HTTP error! status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.audio) {
                    if (audioCache.size > 50) {
                        const firstKey = audioCache.keys().next().value;
                        audioCache.delete(firstKey);
                    }
                    audioCache.set(text, data.audio);
                    playBase64Audio(data.audio, options);
                } else {
                    throw new Error('No audio in response');
                }
            })
            .catch(error => {
                console.error('Cloud TTS error:', error);
                speakWithWebSpeech(text, options);
            });
    }

    // ========== WEB SPEECH API ==========

    function speakWithWebSpeech(text, options = {}) {
        if (!window.speechSynthesis) {
            if (options.onEnd) setTimeout(options.onEnd, 10);
            return false;
        }

        try {
            window.speechSynthesis.cancel();
        } catch (e) {}

        if (options.onStart) options.onStart();
        currentGameId = options.gameId || null;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1.0;

        currentUtterance = utterance;

        utterance.onend = () => {
            console.log('WebSpeech ended');
            isSpeaking = false;
            currentUtterance = null;
            currentGameId = null;
            if (options.onEnd) options.onEnd();
        };

        utterance.onerror = (event) => {
            if (event.error === 'interrupted') {
                console.log('WebSpeech interrupted (normal)');
            } else {
                console.warn('WebSpeech error:', event.error);
            }
            isSpeaking = false;
            currentUtterance = null;
            currentGameId = null;
            if (options.onError) options.onError(event);
            if (options.onEnd) options.onEnd();
        };

        try {
            window.speechSynthesis.speak(utterance);
            isSpeaking = true;
        } catch (e) {
            console.error('WebSpeech speak error:', e);
            if (options.onError) options.onError(e);
            if (options.onEnd) options.onEnd();
        }

        return true;
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

    function playBase64Audio(base64Data, options) {
        try {
            if (audioContext && audioContext.state !== 'closed') {
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                audioContext.decodeAudioData(bytes.buffer, (buffer) => {
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContext.destination);

                    currentAudio = source;

                    source.onended = () => {
                        console.log('Audio ended');
                        isSpeaking = false;
                        currentAudio = null;
                        currentGameId = null;
                        if (options.onEnd) options.onEnd();
                    };

                    source.start();
                    isSpeaking = true;

                }, (error) => {
                    console.error('Audio decode error:', error);
                    playAsAudioElement(base64Data, options);
                });
            } else {
                playAsAudioElement(base64Data, options);
            }
        } catch (error) {
            console.error('Play error:', error);
            if (options.onError) options.onError(error);
            if (options.onEnd) options.onEnd();
        }
    }

    function playAsAudioElement(base64Data, options) {
        const audio = new Audio(`data:audio/ogg;base64,${base64Data}`);
        currentAudio = audio;

        audio.onplay = () => {
            isSpeaking = true;
        };

        audio.onended = () => {
            console.log('Audio element ended');
            isSpeaking = false;
            currentAudio = null;
            currentGameId = null;
            if (options.onEnd) options.onEnd();
        };

        audio.onerror = (e) => {
            console.error('Audio element error:', e);
            isSpeaking = false;
            currentAudio = null;
            currentGameId = null;
            if (options.onError) options.onError(e);
            if (options.onEnd) options.onEnd();
        };

        audio.play().catch(e => {
            console.error('Audio play error:', e);
            if (options.onError) options.onError(e);
            if (options.onEnd) options.onEnd();
        });
    }

    function playAudioData(audioData, options) {
        playBase64Audio(audioData, options);
    }

    function isSupported() {
        return isBuiltInAliceAvailable() ||
            !!(window.AudioContext || window.webkitAudioContext) ||
            !!window.speechSynthesis;
    }

    function onQueueComplete(callback) {
        onQueueCompleteCallback = callback;
    }

    function clearCache() {
        audioCache.clear();
    }

    function toggleVoice() {
        const newState = !getVoiceState();
        setVoiceState(newState);
        return newState;
    }

    // Инициализация
    init();

    return {
        // Основные методы
        queueSpeech,
        stopSpeaking,
        isSupported,
        onQueueComplete,
        clearCache,
        getBrowserInfo: () => ({ ...browserInfo }),
        isBuiltInAliceAvailable,

        // Управление
        toggleVoice,
        isVoiceEnabled,
        getVoiceState,
        setVoiceState,

        // Очистка по игре
        clearQueueForGame,

        // Внутренние методы
        _resetQueue: () => {
            stopCurrentSpeech();
            speechQueue = [];
            isProcessingQueue = false;
            onQueueCompleteCallback = null;
        },
        _getQueueLength: () => speechQueue.length,
        _getCurrentGame: () => currentGameId
    };
})();

window.VoiceCore = VoiceCore;