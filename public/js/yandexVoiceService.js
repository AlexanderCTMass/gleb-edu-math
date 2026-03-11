// ========== СЕРВИС ОЗВУЧКИ С ПОДДЕРЖКОЙ АЛИСЫ В ЯНДЕКС.БРАУЗЕРЕ ==========
const YandexVoiceService = (function() {
    // Конфигурация
    const API_URL = '/api/tts'; // Относительный путь (фронтенд и бэкенд на одном сервере)

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

    console.log('Browser info:', browserInfo);

    // ========== ИНИЦИАЛИЗАЦИЯ ==========

    function init() {
        if (browserInfo.isYandexBrowser) {
            console.log('🎤 Яндекс.Браузер detected, using built-in Alice');
        }

        // Инициализация AudioContext после взаимодействия с пользователем
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
        return GameState.getProp('voiceEnabled');
    }

    // ========== УПРАВЛЕНИЕ ОЧЕРЕДЬЮ ==========

    function queueSpeech(text, options = {}) {
        if (!isVoiceEnabled()) {
            if (options.onEnd) setTimeout(options.onEnd, 10);
            return false;
        }

        speechQueue.push({ text, options });

        // Если очередь не обрабатывается, запускаем обработку
        if (!isProcessingQueue) {
            processQueue();
        }

        return true;
    }

    function processQueue() {
        // Если уже обрабатываем или очередь пуста
        if (isProcessingQueue || speechQueue.length === 0) {
            // Если очередь пуста и есть колбэк завершения
            if (speechQueue.length === 0 && onQueueCompleteCallback) {
                const callback = onQueueCompleteCallback;
                onQueueCompleteCallback = null;
                setTimeout(callback, 100);
            }
            return;
        }

        isProcessingQueue = true;
        const next = speechQueue.shift();

        // Останавливаем текущее воспроизведение перед новым
        stopCurrentSpeech();

        // Небольшая задержка для чистоты
        setTimeout(() => {
            // Пытаемся использовать разные методы озвучки в порядке приоритета
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
        // Останавливаем Web Speech
        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {
                console.warn('Error canceling speech:', e);
            }
        }

        // Останавливаем аудио
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

        // Останавливаем AudioContext
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

    /**
     * Пробуем разные методы озвучки в порядке приоритета
     */
    function trySpeak(text, options) {
        // 1. Для Яндекс.Браузера - встроенная Алиса
        if (isBuiltInAliceAvailable()) {
            if (speakWithBuiltInAlice(text, options)) {
                return;
            }
        }

        // 2. Наш серверный API (через Yandex Cloud)
        speakWithCloudAPI(text, options);
    }

    // ========== API ДЛЯ ЯНДЕКС.БРАУЗЕРА ==========

    /**
     * Использование встроенной Алисы в Яндекс.Браузере
     */
    function speakWithBuiltInAlice(text, options = {}) {
        if (!browserInfo.hasYandexSpeaker) {
            return false;
        }

        try {
            if (options.onStart) options.onStart();

            // API Яндекс.Браузера для Алисы
            const speaker = window.external.GetSpeaker();

            // Настройки голоса
            speaker.Rate = options.rate || 1.0;
            speaker.Volume = options.volume || 100;
            speaker.Voice = 'Alice'; // Можно выбрать: Alice, Ok, Mitia, Yandex и др.

            // Воспроизведение
            speaker.Speak(text);
            isSpeaking = true;

            // В Яндекс.Браузере нет прямого события окончания,
            // поэтому используем таймер для приблизительной длительности
            const wordCount = text.split(' ').length;
            const duration = Math.max(1000, wordCount * 400); // Примерно 400ms на слово

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

    /**
     * Проверка, доступна ли встроенная Алиса
     */
    function isBuiltInAliceAvailable() {
        return browserInfo.isYandexBrowser && browserInfo.hasYandexSpeaker;
    }

    // ========== ОБЛАЧНОЕ API (через ваш сервер) ==========

    function speakWithCloudAPI(text, options) {
        stopCurrentSpeech();

        if (options.onStart) options.onStart();

        // Проверяем кэш
        if (audioCache.has(text)) {
            console.log('Using cached audio for:', text.substring(0, 30));
            playAudioData(audioCache.get(text), options);
            return;
        }

        console.log('Requesting TTS from server:', text.substring(0, 30));

        // Загружаем с API
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
                    // Сохраняем в кэш
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
                // Пробуем Web Speech API как fallback
                speakWithWebSpeech(text, options);
            });
    }

    // ========== WEB SPEECH API (fallback) ==========

    function speakWithWebSpeech(text, options = {}) {
        if (!window.speechSynthesis) {
            if (options.onEnd) setTimeout(options.onEnd, 10);
            return false;
        }

        // Останавливаем предыдущее воспроизведение
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
            // Игнорируем 'interrupted' - это нормально при остановке
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

    // ========== МЕТОДЫ ДЛЯ РАЗЛИЧНЫХ ТИПОВ ОЗВУЧКИ ==========

    function speakQuestion(number, left, right, unknownSide) {
        if (!isVoiceEnabled()) return false;

        questionCounter++;
        let text = '';

        if (unknownSide === 'left') {
            const variants = [
                `Смотри, тут число ${number}. Мы знаем, что одно слагаемое - ${right}. Какое второе?`,
                `Если к числу ${right} добавить какое-то число, получится ${number}. Что это за число?`,
                `${right} плюс сколько будет ${number}?`,
                `Найди недостающее число: ${right} + ? = ${number}`,
                `Какое число нужно прибавить к ${right}, чтобы получить ${number}?`,
                `У нас есть ${right}. Сколько ещё нужно добавить, чтобы стало ${number}?`,
                `Заполни окошечко: ${right} + ... = ${number}`,
                `${number} - это ${right} и сколько?`,
                `Помоги найти второе слагаемое: ${right} + ? = ${number}`,
                `В домике на этом этаже ${number} живёт ${right}. Кто второй сосед?`
            ];
            text = variants[questionCounter % variants.length];

        } else if (unknownSide === 'right') {
            const variants = [
                `Смотри, тут число ${number}. Мы знаем, что одно слагаемое - ${left}. Какое второе?`,
                `Если к числу ${left} добавить какое-то число, получится ${number}. Что это за число?`,
                `${left} плюс сколько будет ${number}?`,
                `Найди недостающее число: ${left} + ? = ${number}`,
                `Какое число нужно прибавить к ${left}, чтобы получить ${number}?`,
                `У нас есть ${left}. Сколько ещё нужно добавить, чтобы стало ${number}?`,
                `Заполни окошечко: ${left} + ... = ${number}`,
                `${number} - это ${left} и сколько?`,
                `Помоги найти второе слагаемое: ${left} + ? = ${number}`,
                `В домике на этом этаже ${number} живёт ${left}. Кто второй сосед?`
            ];
            text = variants[questionCounter % variants.length];

        } else if (unknownSide === 'result') {
            const variants = [
                `Сколько будет ${left} плюс ${right}?`,
                `Посчитай: ${left} + ${right} = ?`,
                `Если сложить ${left} и ${right}, сколько получится?`,
                `${left} да ${right} - это сколько вместе?`,
                `Найди сумму чисел ${left} и ${right}`,
                `${left} плюс ${right} равно?`,
                `Сколько всего будет, если к ${left} прибавить ${right}?`,
                `Сосчитай-ка: ${left} + ${right}`,
                `Какой результат у этого примера: ${left} + ${right}?`,
                `Помоги решить: к ${left} прибавить ${right}`
            ];
            text = variants[questionCounter % variants.length];
        }

        return queueSpeech(text, { rate: 0.9 });
    }

    function speakCorrectAnswer(number, left, right, unknownSide) {
        if (!isVoiceEnabled()) return false;

        correctCounter++;
        let text = '';

        const praises = [
            'Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!',
            'Супер!', 'Умница!', 'Великолепно!', 'Замечательно!', 'Точно!',
            'Так держать!', 'Прекрасно!', 'Правильный ответ!'
        ];

        const praise = praises[correctCounter % praises.length];

        if (unknownSide === 'left') {
            const variants = [
                `${praise} ${number} - это ${right} и ${left}`,
                `${praise} Чтобы получить ${number}, нужно к ${right} прибавить ${left}`,
                `${praise} ${right} плюс ${left} как раз будет ${number}`,
                `${praise} Именно так: ${right} + ${left} = ${number}`,
                `${praise} Ты нашёл второе слагаемое - это ${left}`,
                `${praise} ${number} состоит из ${right} и ${left}`,
                `Абсолютно верно! ${right} + ${left} = ${number}`,
                `${praise} Всё правильно: ${right} и ${left} вместе дают ${number}`
            ];
            text = variants[correctCounter % variants.length];

        } else if (unknownSide === 'right') {
            const variants = [
                `${praise} ${number} - это ${left} и ${right}`,
                `${praise} Чтобы получить ${number}, нужно к ${left} прибавить ${right}`,
                `${praise} ${left} плюс ${right} как раз будет ${number}`,
                `${praise} Именно так: ${left} + ${right} = ${number}`,
                `${praise} Ты нашёл второе слагаемое - это ${right}`,
                `${praise} ${number} состоит из ${left} и ${right}`,
                `Абсолютно верно! ${left} + ${right} = ${number}`,
                `${praise} Всё правильно: ${left} и ${right} вместе дают ${number}`
            ];
            text = variants[correctCounter % variants.length];

        } else if (unknownSide === 'result') {
            const variants = [
                `${praise} ${left} плюс ${right} равно ${number}`,
                `${praise} Сумма чисел ${left} и ${right} - это ${number}`,
                `${praise} ${left} + ${right} = ${number}`,
                `${praise} Всё верно, получается ${number}`,
                `${praise} Ты правильно посчитал: ${number}`,
                `Правильно! ${left} да ${right} - будет ${number}`,
                `${praise} Отличный счёт! ${left} + ${right} = ${number}`,
                `Верно-верно! ${left} и ${right} вместе дают ${number}`
            ];
            text = variants[correctCounter % variants.length];
        }

        return queueSpeech(text);
    }

    function speakWrongAnswer() {
        if (!isVoiceEnabled()) return false;

        wrongCounter++;

        const texts = [
            'Попробуй ещё раз!',
            'Не получается? Давай подумаем вместе',
            'Почти, попробуй другой вариант',
            'Ой, что-то не так. Давай ещё разок',
            'Не угадал. Попробуй снова',
            'Хм, не тот ответ. Подумай ещё',
            'Ошибочка вышла! Давай другую цифру',
            'Не спеши, подумай внимательнее',
            'Немножко не так. Какое число подойдёт?',
            'Не верно. Давай попробуем другую цифру',
            'Ой, не то. Посмотри внимательнее на пример',
            'Так не получится. Какое число нужно?',
            'Не выходит? Ничего страшного, пробуй дальше!'
        ];

        const text = texts[wrongCounter % texts.length];
        return queueSpeech(text);
    }

    function speakNumberComposition(number, floors) {
        if (!isVoiceEnabled()) return false;

        const introVariants = [
            `Число ${number} можно получить разными способами. `,
            `Посмотри, как можно составить число ${number}. `,
            `Давай узнаем все способы получить число ${number}. `,
            `Число ${number} состоит из разных пар чисел. `,
            `Вот все варианты состава числа ${number}. `
        ];

        let text = introVariants[Math.floor(Math.random() * introVariants.length)];

        const variants = [];
        floors.forEach((floor) => {
            variants.push(`${floor.left} и ${floor.right}`);
        });

        const listStyles = [
            () => variants.join(', ') + '. ',
            () => 'можно получить как ' + variants.join(', или как ') + '. ',
            () => 'это ' + variants.join(', также это ') + '. '
        ];

        const listStyle = listStyles[Math.floor(Math.random() * listStyles.length)];
        text += listStyle();

        const endings = [
            'Давай попробуем решить примеры!',
            'А теперь твоя очередь решать!',
            'Попробуй найти нужные числа!',
            'Готов решать примеры?',
            'Сможешь найти все числа?'
        ];

        text += endings[Math.floor(Math.random() * endings.length)];

        return queueSpeech(text, {
            rate: 0.9,
            onStart: () => {
                $('#speakButton').addClass('speaking');
            },
            onEnd: () => {
                $('#speakButton').removeClass('speaking');
            }
        });
    }

    function speakFloor(number, left, right) {
        if (!isVoiceEnabled()) return false;

        const variants = [
            `${left} плюс ${right} равно ${number}`,
            `${left} и ${right} вместе дают ${number}`,
            `Если сложить ${left} и ${right}, получится ${number}`,
            `${left} + ${right} = ${number}`,
            `К ${left} прибавить ${right} - будет ${number}`,
            `${left} да ${right} - это ${number}`
        ];

        const text = variants[Math.floor(Math.random() * variants.length)];
        return queueSpeech(text);
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

    // Публичное API
    return {
        // Основные методы
        speakQuestion,
        speakCorrectAnswer,
        speakWrongAnswer,
        speakNumberComposition,
        speakFloor,
        stopSpeaking,
        isSupported,
        onQueueComplete,
        resetCounters,
        clearCache,
        isVoiceEnabled,

        // Специфичные для отладки
        getBrowserInfo: () => ({ ...browserInfo }),
        isBuiltInAliceAvailable,

        // Для совместимости со старым кодом
        speak: (text, options) => queueSpeech(text, options)
    };
})();

// Заменяем старый VoiceService на новый
const VoiceService = YandexVoiceService;