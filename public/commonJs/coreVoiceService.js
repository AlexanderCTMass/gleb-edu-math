// ========== ЯДРО ОЗВУЧКИ ==========
const VoiceCore = (function() {
    // Конфигурация
    const API_URL = '/api/tts';

    // Константы
    const CACHE_MAX_SIZE = 50;
    const QUEUE_DELAY = 50;
    const WORD_DURATION_MS = 400;

    // Состояние
    let isSpeaking = false;
    let currentAudio = null;
    let audioContext = null;
    let currentUtterance = null;
    let currentGameId = null;

    // Очередь озвучки
    let speechQueue = [];
    let isProcessingQueue = false;
    let onQueueCompleteCallback = null;

    // Кэш для уже загруженных аудио (с частотой использования)
    const audioCache = new Map(); // key -> {data, hits, lastUsed}

    // Определяем тип браузера и доступные API
    const browserInfo = {
        isYandexBrowser: /YaBrowser/i.test(navigator.userAgent),
        hasYandexSpeaker: !!(window.external && typeof window.external.GetSpeaker === 'function'),
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
        // Dispatch события для синхронизации с GameState
        window.dispatchEvent(new CustomEvent('voiceStateChanged', { detail: { enabled } }));
    }

    function isVoiceEnabled() {
        return getVoiceState();
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ==========

    function init() {
        if (browserInfo.isYandexBrowser) {
            console.log('🎤 Яндекс.Браузер detected, using built-in Alice');
        }

        // Слушаем события от GameState
        window.addEventListener('voiceStateChanged', (e) => {
            if (e.detail && typeof e.detail.enabled !== 'undefined') {
                setVoiceState(e.detail.enabled);
            }
        });

        document.addEventListener('click', initAudioContext, { once: true });
        document.addEventListener('touchstart', initAudioContext, { once: true });
    }

    function initAudioContext() {
        if (!audioContext && browserInfo.hasWebAudio) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    audioContext.resume().catch(console.warn);
                }
            } catch (e) {
                console.error('Failed to initialize AudioContext:', e);
            }
        }
    }

    // ========== УПРАВЛЕНИЕ ОЧЕРЕДЬЮ ==========

    function queueSpeech(text, options = {}) {
        if (!isVoiceEnabled() && !options.force) {
            if (options.onEnd) safeCallback(options.onEnd);
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
                safeCallback(callback, 100);
            }
            return;
        }

        isProcessingQueue = true;
        const next = speechQueue.shift();

        stopCurrentSpeech();

        safeCallback(() => {
            trySpeak(next.text, {
                ...next.options,
                onEnd: () => {
                    console.log(`Speech ended for game: ${next.options.gameId}`);
                    isProcessingQueue = false;
                    if (next.options.onEnd) safeCallback(next.options.onEnd);
                    processQueue();
                },
                onError: (error) => {
                    console.warn('Speech error (handled):', error?.error || error);
                    isProcessingQueue = false;
                    if (next.options.onError) safeCallback(() => next.options.onError(error));
                    if (next.options.onEnd) safeCallback(next.options.onEnd);
                    processQueue();
                }
            });
        }, QUEUE_DELAY);
    }

    function stopCurrentSpeech() {
        // Остановка Web Speech
        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {
                console.warn('Error canceling speech:', e);
            }
        }

        // Остановка аудио
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

        // Остановка Яндекс.Алисы
        if (browserInfo.hasYandexSpeaker) {
            try {
                const speaker = window.external.GetSpeaker();
                if (speaker && typeof speaker.Stop === 'function') {
                    speaker.Stop();
                }
            } catch (e) {
                console.warn('Error stopping Yandex speaker:', e);
            }
        }

        // Закрытие AudioContext
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
            if (isSpeaking && currentGameId === gameId) {
                stopCurrentSpeech();
            }
            clearQueueForGame(gameId);
        } else {
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
        // Проверяем поддержку браузера
        if (!isAnySpeechSupported()) {
            console.warn('No speech synthesis supported');
            if (options.onError) options.onError(new Error('No speech supported'));
            if (options.onEnd) options.onEnd();
            return;
        }

        if (isBuiltInAliceAvailable()) {
            if (speakWithBuiltInAlice(text, options)) {
                return;
            }
        }

        // Пробуем облачное API только если есть поддержка AudioContext
        if (browserInfo.hasWebAudio) {
            speakWithCloudAPI(text, options);
        } else {
            speakWithWebSpeech(text, options);
        }
    }

    function isAnySpeechSupported() {
        return browserInfo.hasYandexSpeaker ||
            browserInfo.hasWebAudio ||
            browserInfo.hasSpeechSynthesis;
    }

    function speakWithBuiltInAlice(text, options = {}) {
        if (!browserInfo.hasYandexSpeaker) {
            return false;
        }

        try {
            const speaker = window.external.GetSpeaker();

            // Проверяем наличие необходимых методов
            if (!speaker || typeof speaker.Speak !== 'function') {
                return false;
            }

            if (options.onStart) safeCallback(options.onStart);

            currentGameId = options.gameId || null;

            // Устанавливаем параметры, если они поддерживаются
            if (typeof speaker.Rate !== 'undefined') {
                speaker.Rate = options.rate || 1.0;
            }
            if (typeof speaker.Volume !== 'undefined') {
                speaker.Volume = options.volume || 100;
            }
            if (typeof speaker.Voice !== 'undefined') {
                speaker.Voice = 'Alice';
            }

            speaker.Speak(text);

            isSpeaking = true;

            const wordCount = text.split(' ').length;
            const duration = Math.max(1000, wordCount * WORD_DURATION_MS);

            setTimeout(() => {
                isSpeaking = false;
                currentGameId = null;
                if (options.onEnd) safeCallback(options.onEnd);
            }, duration);

            return true;
        } catch (e) {
            console.error('Failed to use built-in Alice:', e);
            return false;
        }
    }

    function isBuiltInAliceAvailable() {
        try {
            return browserInfo.isYandexBrowser &&
                browserInfo.hasYandexSpeaker &&
                window.external.GetSpeaker() !== null;
        } catch (e) {
            return false;
        }
    }

    // ========== ОБЛАЧНОЕ API ==========

    function speakWithCloudAPI(text, options) {
        stopCurrentSpeech();

        if (options.onStart) safeCallback(options.onStart);
        currentGameId = options.gameId || null;

        // Проверяем кэш
        if (audioCache.has(text)) {
            console.log('Using cached audio for:', text.substring(0, 30));
            const cached = audioCache.get(text);
            cached.hits++;
            cached.lastUsed = Date.now();
            playAudioData(cached.data, options);
            return;
        }

        console.log('Requesting TTS from server:', text.substring(0, 30));

        // Таймаут для fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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
            }),
            signal: controller.signal
        })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || `HTTP error! status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.audio) {
                    // Кэшируем с информацией о частоте использования
                    if (audioCache.size >= CACHE_MAX_SIZE) {
                        evictLeastUsed();
                    }
                    audioCache.set(text, {
                        data: data.audio,
                        hits: 1,
                        lastUsed: Date.now()
                    });
                    playBase64Audio(data.audio, options);
                } else {
                    throw new Error('No audio in response');
                }
            })
            .catch(error => {
                clearTimeout(timeoutId);
                console.error('Cloud TTS error:', error);
                // Пробуем web speech как запасной вариант
                if (browserInfo.hasSpeechSynthesis) {
                    speakWithWebSpeech(text, options);
                } else {
                    if (options.onError) options.onError(error);
                    if (options.onEnd) options.onEnd();
                }
            });
    }

    function evictLeastUsed() {
        let leastUsedKey = null;
        let leastUsedHits = Infinity;
        let oldestTime = Infinity;

        for (const [key, value] of audioCache.entries()) {
            // Комбинированная метрика: меньше хитов или старше
            if (value.hits < leastUsedHits ||
                (value.hits === leastUsedHits && value.lastUsed < oldestTime)) {
                leastUsedHits = value.hits;
                oldestTime = value.lastUsed;
                leastUsedKey = key;
            }
        }

        if (leastUsedKey) {
            audioCache.delete(leastUsedKey);
        }
    }

    // ========== WEB SPEECH API ==========

    function speakWithWebSpeech(text, options = {}) {
        if (!window.speechSynthesis) {
            if (options.onEnd) safeCallback(options.onEnd);
            return false;
        }

        try {
            window.speechSynthesis.cancel();
        } catch (e) {}

        if (options.onStart) safeCallback(options.onStart);
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
            if (options.onEnd) safeCallback(options.onEnd);
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
            if (options.onError) safeCallback(() => options.onError(event));
            if (options.onEnd) safeCallback(options.onEnd);
        };

        try {
            window.speechSynthesis.speak(utterance);
            isSpeaking = true;
        } catch (e) {
            console.error('WebSpeech speak error:', e);
            if (options.onError) safeCallback(() => options.onError(e));
            if (options.onEnd) safeCallback(options.onEnd);
        }

        return true;
    }

    // ========== БЕЗОПАСНЫЙ ВЫЗОВ КОЛБЭКОВ ==========

    function safeCallback(callback, delay = 0) {
        if (typeof callback !== 'function') return;

        if (delay > 0) {
            setTimeout(() => {
                try {
                    callback();
                } catch (e) {
                    console.error('Error in safeCallback:', e);
                }
            }, delay);
        } else {
            try {
                callback();
            } catch (e) {
                console.error('Error in safeCallback:', e);
            }
        }
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
                        if (options.onEnd) safeCallback(options.onEnd);
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
            if (options.onError) safeCallback(() => options.onError(error));
            if (options.onEnd) safeCallback(options.onEnd);
        }
    }

    function playAudioData(audioData, options) {
        playBase64Audio(audioData, options);
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
            if (options.onEnd) safeCallback(options.onEnd);
        };

        audio.onerror = (e) => {
            console.error('Audio element error:', e);
            isSpeaking = false;
            currentAudio = null;
            currentGameId = null;
            if (options.onError) safeCallback(() => options.onError(e));
            if (options.onEnd) safeCallback(options.onEnd);
        };

        audio.play().catch(e => {
            console.error('Audio play error:', e);
            if (options.onError) safeCallback(() => options.onError(e));
            if (options.onEnd) safeCallback(options.onEnd);
        });
    }

    function isSupported() {
        return isBuiltInAliceAvailable() ||
            browserInfo.hasWebAudio ||
            browserInfo.hasSpeechSynthesis;
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

        // Для синхронизации с GameState
        syncWithGameState: (enabled) => {
            setVoiceState(enabled);
        },

        // Внутренние методы (для отладки)
        _resetQueue: () => {
            stopCurrentSpeech();
            speechQueue = [];
            isProcessingQueue = false;
            onQueueCompleteCallback = null;
        },
        _getQueueLength: () => speechQueue.length,
        _getCurrentGame: () => currentGameId,
        _getCacheSize: () => audioCache.size,
        _initAudioContext: function() {
            if (!audioContext && browserInfo.hasWebAudio) {
                try {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    if (audioContext.state === 'suspended') {
                        audioContext.resume().catch(console.warn);
                    }
                    console.log('AudioContext initialized by user gesture');
                } catch (e) {
                    console.error('Failed to initialize AudioContext:', e);
                }
            }
        },
    };
})();

window.VoiceCore = VoiceCore;