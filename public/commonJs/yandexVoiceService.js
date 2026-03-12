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

    // Определяем тип браузера и доступные API
    const browserInfo = {
        isYandexBrowser: /YaBrowser/i.test(navigator.userAgent),
        hasYandexSpeaker: !!(window.external && window.external.GetSpeaker),
        hasSpeechSynthesis: !!window.speechSynthesis,
        hasWebAudio: !!(window.AudioContext || window.webkitAudioContext)
    };

    console.log('UnifiedVoiceService browser info:', browserInfo);

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

    // Получение состояния голоса из активной игры
    function getVoiceState() {
        // Проверяем, какая игра активна (можно определить по наличию глобальных объектов)
        if (typeof SyllableGameState !== 'undefined' && SyllableGameState.get) {
            return SyllableGameState.getProp('voiceEnabled');
        }
        if (typeof GameState !== 'undefined' && GameState.get) {
            return GameState.getProp('voiceEnabled');
        }
        return true; // По умолчанию включено
    }

    function getAutoVoiceState() {
        if (typeof SyllableGameState !== 'undefined' && SyllableGameState.get) {
            return SyllableGameState.getProp('autoVoice');
        }
        if (typeof GameState !== 'undefined' && GameState.get) {
            return GameState.getProp('autoVoice');
        }
        return true;
    }

    // Обновление состояния голоса в активной игре
    function setVoiceState(enabled) {
        if (typeof SyllableGameState !== 'undefined' && SyllableGameState.get) {
            SyllableGameState.update('voiceEnabled', enabled);
        }
        if (typeof GameState !== 'undefined' && GameState.get) {
            GameState.update('voiceEnabled', enabled);
        }
    }

    function setAutoVoiceState(enabled) {
        if (typeof SyllableGameState !== 'undefined' && SyllableGameState.get) {
            SyllableGameState.update('autoVoice', enabled);
        }
        if (typeof GameState !== 'undefined' && GameState.get) {
            GameState.update('autoVoice', enabled);
        }
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
                onEnd: () => {
                    console.log('Speech ended normally');
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

    // ========== ОСНОВНЫЕ МЕТОДЫ ДЛЯ МАТЕМАТИЧЕСКОЙ ИГРЫ ==========

    function speakMathQuestion(number, left, right, unknownSide) {
        if (!isVoiceEnabled()) return false;

        questionCounter++;
        let text = '';

        if (unknownSide === 'left') {
            const variants = [
                `Смотри, тут число ${number}. Мы знаем, что одно слагаемое - ${right}. Какое второе?`,
                `Если к числу ${right} добавить какое-то число, получится ${number}. Что это за число?`,
                `${right} плюс сколько будет ${number}?`,
                `Найди недостающее число: ${right} + ? = ${number}`,
                `Какое число нужно прибавить к ${right}, чтобы получить ${number}?`
            ];
            text = variants[questionCounter % variants.length];
        } else if (unknownSide === 'right') {
            const variants = [
                `Смотри, тут число ${number}. Мы знаем, что одно слагаемое - ${left}. Какое второе?`,
                `Если к числу ${left} добавить какое-то число, получится ${number}. Что это за число?`,
                `${left} плюс сколько будет ${number}?`,
                `Найди недостающее число: ${left} + ? = ${number}`,
                `Какое число нужно прибавить к ${left}, чтобы получить ${number}?`
            ];
            text = variants[questionCounter % variants.length];
        } else if (unknownSide === 'result') {
            const variants = [
                `Сколько будет ${left} плюс ${right}?`,
                `Посчитай: ${left} + ${right} = ?`,
                `Если сложить ${left} и ${right}, сколько получится?`,
                `${left} да ${right} - это сколько вместе?`,
                `Найди сумму чисел ${left} и ${right}`
            ];
            text = variants[questionCounter % variants.length];
        }

        return queueSpeech(text, { rate: 0.9 });
    }

    function speakMathCorrectAnswer(number, left, right, unknownSide) {
        if (!isVoiceEnabled()) return false;

        correctCounter++;
        let text = '';

        const praises = ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!', 'Супер!'];
        const praise = praises[correctCounter % praises.length];

        if (unknownSide === 'left') {
            const variants = [
                `${praise} ${number} - это ${right} и ${left}`,
                `${praise} Чтобы получить ${number}, нужно к ${right} прибавить ${left}`,
                `${praise} ${right} плюс ${left} как раз будет ${number}`
            ];
            text = variants[correctCounter % variants.length];
        } else if (unknownSide === 'right') {
            const variants = [
                `${praise} ${number} - это ${left} и ${right}`,
                `${praise} Чтобы получить ${number}, нужно к ${left} прибавить ${right}`,
                `${praise} ${left} плюс ${right} как раз будет ${number}`
            ];
            text = variants[correctCounter % variants.length];
        } else if (unknownSide === 'result') {
            const variants = [
                `${praise} ${left} плюс ${right} равно ${number}`,
                `${praise} Сумма чисел ${left} и ${right} - это ${number}`,
                `${praise} ${left} + ${right} = ${number}`
            ];
            text = variants[correctCounter % variants.length];
        }

        return queueSpeech(text);
    }

    function speakMathNumberComposition(number, floors) {
        if (!isVoiceEnabled()) return false;

        let text = `Число ${number} можно получить разными способами. `;

        const variants = floors.map(floor => `${floor.left} и ${floor.right}`).join(', ');
        text += variants + '. ';

        text += 'Давай попробуем решить примеры!';

        return queueSpeech(text, {
            rate: 0.9,
            onStart: () => {
                const $speakButton = $('#speakButton');
                if ($speakButton.length) $speakButton.addClass('speaking');
            },
            onEnd: () => {
                const $speakButton = $('#speakButton');
                if ($speakButton.length) $speakButton.removeClass('speaking');
            }
        });
    }

    // ========== МЕТОДЫ ДЛЯ СЛОГОВОЙ ИГРЫ ==========

    function speakSyllableQuestion(syllable, word, position) {
        if (!isVoiceEnabled()) return false;

        questionCounter++;
        let text = '';

        const variants = [
            `Какой слог пропущен в слове ${word}?`,
            `Найди пропущенный слог в слове ${word}`,
            `Какой слог нужно добавить, чтобы получилось слово ${word}?`,
            `В слове ${word} пропущен слог. Какой?`
        ];
        text = variants[questionCounter % variants.length];

        return queueSpeech(text, { rate: 0.9 });
    }

    function speakSyllableCorrectAnswer(syllable, word) {
        if (!isVoiceEnabled()) return false;

        correctCounter++;

        const praises = ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!'];
        const praise = praises[correctCounter % praises.length];

        const variants = [
            `${praise} Слог "${syllable}" - правильный ответ!`,
            `${praise} Ты правильно выбрал слог "${syllable}" в слове ${word}`,
            `${praise} "${syllable}" - верно!`
        ];

        const text = variants[correctCounter % variants.length];
        return queueSpeech(text);
    }

    function speakSyllableWrongAnswer(correctSyllable) {
        if (!isVoiceEnabled()) return false;

        wrongCounter++;

        const variants = [
            'Попробуй другой слог',
            'Не угадал, попробуй ещё раз',
            'Почти, давай подумаем вместе',
            'Этот слог не подходит, попробуй другой',
            `Нет, это не "${correctSyllable}"?`
        ];

        const text = variants[wrongCounter % variants.length];
        return queueSpeech(text);
    }

    function speakSyllableLearning(syllable, word) {
        if (!isVoiceEnabled()) return false;

        const variants = [
            `Слог "${syllable}" встречается в слове ${word}`,
            `Послушай: "${syllable}" - ${word}`,
            `${word} - этот слог "${syllable}"`,
            `Запомни: слог "${syllable}" есть в слове ${word}`
        ];

        const text = variants[questionCounter % variants.length];

        return queueSpeech(text, {
            rate: 0.8,
            onStart: () => {
                const $speakButton = $('#syllableSpeakButton');
                if ($speakButton.length) $speakButton.addClass('speaking');
            },
            onEnd: () => {
                const $speakButton = $('#syllableSpeakButton');
                if ($speakButton.length) $speakButton.removeClass('speaking');
            }
        });
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
        const newState = !getVoiceState();
        setVoiceState(newState);
        return newState;
    }

    function toggleAutoVoice() {
        const newState = !getAutoVoiceState();
        setAutoVoiceState(newState);
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

    // Инициализация
    init();

    return {
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

        // Методы для математической игры
        speakMathQuestion,
        speakMathCorrectAnswer,
        speakMathNumberComposition,

        // Методы для слоговой игры
        speakSyllableQuestion,
        speakSyllableCorrectAnswer,
        speakSyllableWrongAnswer,
        speakSyllableLearning,

        // Управление
        toggleVoice,
        toggleAutoVoice,
        isVoiceEnabled,
        getVoiceState,
        getAutoVoiceState
    };
})();

// Заменяем старые сервисы на универсальный
const VoiceService = UnifiedVoiceService;
const YandexVoiceService = UnifiedVoiceService; // Для обратной совместимости