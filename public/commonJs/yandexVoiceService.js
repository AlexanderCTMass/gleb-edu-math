// ========== УНИВЕРСАЛЬНЫЙ СЕРВИС ОЗВУЧКИ ==========
const UnifiedVoiceService = (function() {
    // Конфигурация
    const API_URL = '/api/tts';

    // Состояние
    let isSpeaking = false;
    let currentAudio = null;
    let audioContext = null;
    let currentUtterance = null;

    // Очередь озвучки
    let speechQueue = [];
    let isProcessingQueue = false;
    let onQueueCompleteCallback = null;

    // Кэш для уже загруженных аудио
    const audioCache = new Map();

    // Счетчики для разнообразия
    let questionCounter = 0;
    let correctCounter = 0;
    let wrongCounter = 0;

    // Хранилище для разных игр (ключ - имя игры)
    const gameStates = {};

    // Текущая активная игра
    let currentGame = 'default';

    // Определяем тип браузера и доступные API
    const browserInfo = {
        isYandexBrowser: /YaBrowser/i.test(navigator.userAgent),
        hasYandexSpeaker: !!(window.external && window.external.GetSpeaker),
        hasSpeechSynthesis: !!window.speechSynthesis,
        hasWebAudio: !!(window.AudioContext || window.webkitAudioContext)
    };

    console.log('UnifiedVoiceService browser info:', browserInfo);

    // ========== РЕГИСТРАЦИЯ ИГР ==========

    function registerGame(gameName, config) {
        gameStates[gameName] = {
            getVoiceEnabled: config.getVoiceEnabled || (() => true),
            setVoiceEnabled: config.setVoiceEnabled || (() => {}),
            getAutoVoiceEnabled: config.getAutoVoiceEnabled || (() => true),
            setAutoVoiceEnabled: config.setAutoVoiceEnabled || (() => {}),
            onStartSpeaking: config.onStartSpeaking || null,
            onStopSpeaking: config.onStopSpeaking || null
        };
        console.log(`Game "${gameName}" registered with voice service`);
    }

    function setCurrentGame(gameName) {
        if (gameStates[gameName]) {
            currentGame = gameName;
            console.log(`Current game set to: ${gameName}`);
        } else {
            console.warn(`Game "${gameName}" not registered, using default`);
            currentGame = 'default';
        }
    }

    function getCurrentGameState() {
        return gameStates[currentGame] || gameStates['default'] || {
            getVoiceEnabled: () => true,
            setVoiceEnabled: () => {},
            getAutoVoiceEnabled: () => true,
            setAutoVoiceEnabled: () => {},
            onStartSpeaking: null,
            onStopSpeaking: null
        };
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

    function isVoiceEnabled() {
        return getCurrentGameState().getVoiceEnabled();
    }

    // ========== УПРАВЛЕНИЕ ОЧЕРЕДЬЮ ==========

    function queueSpeech(text, options = {}) {
        if (!isVoiceEnabled()) {
            if (options.onEnd) setTimeout(options.onEnd, 10);
            return false;
        }

        speechQueue.push({ text, options });

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
                onStart: () => {
                    const gameState = getCurrentGameState();
                    if (gameState.onStartSpeaking) {
                        gameState.onStartSpeaking();
                    }
                    if (next.options.onStart) next.options.onStart();
                },
                onEnd: () => {
                    console.log('Speech ended normally');
                    isProcessingQueue = false;

                    const gameState = getCurrentGameState();
                    if (gameState.onStopSpeaking) {
                        gameState.onStopSpeaking();
                    }

                    if (next.options.onEnd) next.options.onEnd();
                    processQueue();
                },
                onError: (error) => {
                    console.warn('Speech error (handled):', error?.error || error);
                    isProcessingQueue = false;

                    const gameState = getCurrentGameState();
                    if (gameState.onStopSpeaking) {
                        gameState.onStopSpeaking();
                    }

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
    }

    function trySpeak(text, options) {
        if (isBuiltInAliceAvailable()) {
            if (speakWithBuiltInAlice(text, options)) {
                return;
            }
        }

        speakWithCloudAPI(text, options);
    }

    // ========== API ДЛЯ ЯНДЕКС.БРАУЗЕРА ==========

    function speakWithBuiltInAlice(text, options = {}) {
        if (!browserInfo.hasYandexSpeaker) {
            return false;
        }

        try {
            if (options.onStart) options.onStart();

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

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1.0;

        currentUtterance = utterance;

        utterance.onend = () => {
            console.log('WebSpeech ended');
            isSpeaking = false;
            currentUtterance = null;
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

    function stopSpeaking() {
        stopCurrentSpeech();
        speechQueue = [];
        isProcessingQueue = false;
        onQueueCompleteCallback = null;
    }

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
            if (options.onEnd) options.onEnd();
        };

        audio.onerror = (e) => {
            console.error('Audio element error:', e);
            isSpeaking = false;
            currentAudio = null;
            if (options.onError) options.onError(e);
            if (options.onEnd) options.onEnd();
        };

        audio.play().catch(e => {
            console.error('Audio play error:', e);
            if (options.onError) options.onError(e);
            if (options.onEnd) options.onEnd();
        });
    }

    function isSupported() {
        return isBuiltInAliceAvailable() ||
            !!(window.AudioContext || window.webkitAudioContext) ||
            !!window.speechSynthesis;
    }

    // ========== УНИВЕРСАЛЬНЫЕ МЕТОДЫ ==========

    function speakText(text, options = {}) {
        if (!isVoiceEnabled()) return false;
        return queueSpeech(text, options);
    }

    function speakCorrect() {
        if (!isVoiceEnabled()) return false;

        correctCounter++;

        const praises = ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!', 'Супер!'];
        const text = praises[correctCounter % praises.length];

        return queueSpeech(text);
    }

    function speakWrong() {
        if (!isVoiceEnabled()) return false;

        wrongCounter++;

        const texts = [
            'Попробуй ещё раз!',
            'Не получается? Давай подумаем вместе',
            'Почти, попробуй другой вариант',
            'Не угадал. Попробуй снова',
            'Не верно. Давай попробуем другую цифру'
        ];

        const text = texts[wrongCounter % texts.length];
        return queueSpeech(text);
    }

    // ========== УПРАВЛЕНИЕ ==========

    function toggleVoice() {
        const gameState = getCurrentGameState();
        const currentState = gameState.getVoiceEnabled();
        const newState = !currentState;
        gameState.setVoiceEnabled(newState);
        return newState;
    }

    function toggleAutoVoice() {
        const gameState = getCurrentGameState();
        const currentState = gameState.getAutoVoiceEnabled();
        const newState = !currentState;
        gameState.setAutoVoiceEnabled(newState);
        return newState;
    }

    function onQueueComplete(callback) {
        onQueueCompleteCallback = callback;
    }

    function resetCounters() {
        questionCounter = 0;
        correctCounter = 0;
        wrongCounter = 0;
    }

    function clearCache() {
        audioCache.clear();
    }

    // Регистрируем игру по умолчанию
    registerGame('default', {
        getVoiceEnabled: () => true,
        setVoiceEnabled: () => {},
        getAutoVoiceEnabled: () => true,
        setAutoVoiceEnabled: () => {}
    });

    // Инициализация
    init();

    return {
        // Регистрация игр
        registerGame,
        setCurrentGame,

        // Основные методы
        queueSpeech,
        speakText,
        stopSpeaking,
        isSupported,
        onQueueComplete,
        resetCounters,
        clearCache,
        getBrowserInfo: () => ({ ...browserInfo }),
        isBuiltInAliceAvailable,

        // Универсальные методы для ответов
        speakCorrect,
        speakWrong,

        // Управление
        toggleVoice,
        toggleAutoVoice,
        isVoiceEnabled
    };
})();

// Заменяем старые сервисы на универсальный
const VoiceService = UnifiedVoiceService;
const YandexVoiceService = UnifiedVoiceService; // Для обратной совместимости