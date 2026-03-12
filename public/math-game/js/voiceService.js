// ========== СЕРВИС ДЛЯ МАТЕМАТИЧЕСКОЙ ИГРЫ ==========
const MathVoiceService = (function() {
    console.log('Initializing MathVoiceService...');

    // Проверяем наличие BaseVoiceService
    if (typeof BaseVoiceService === 'undefined') {
        console.error('BaseVoiceService not found! Creating fallback...');

        // Создаем fallback объект с базовыми методами
        return createFallbackService();
    }

    try {
        // Создаем экземпляр базового сервиса
        const base = BaseVoiceService.create('mathGame', {
            getState: (prop) => {
                if (typeof GameState !== 'undefined') {
                    return GameState.getProp(prop);
                }
                return null;
            },
            setState: (prop, value) => {
                if (typeof GameState !== 'undefined') {
                    GameState.update(prop, value);
                }
            },
            getAutoVoice: () => {
                return typeof GameState !== 'undefined' ?
                    GameState.getProp('autoVoice') : true;
            },
            setAutoVoice: (value) => {
                if (typeof GameState !== 'undefined') {
                    GameState.update('autoVoice', value);
                }
            },
            onStartSpeaking: () => {
                $('#speakButton').addClass('speaking');
            },
            onStopSpeaking: () => {
                $('#speakButton').removeClass('speaking');
            },
            onVoiceToggle: (enabled) => {
                if (typeof GameState !== 'undefined') {
                    GameState.update('voiceEnabled', enabled);
                }
            }
        });

        if (!base) {
            console.error('Failed to create base voice service');
            return createFallbackService();
        }

        // ========== СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ ==========

        function speakQuestion(number, left, right, unknownSide) {
            if (!base.isVoiceEnabled()) return false;

            const counters = base._getCounters ? base._getCounters() : { question: 0 };
            counters.question = (counters.question || 0) + 1;

            let text = '';
            const variants = getQuestionVariants(number, left, right, unknownSide);
            text = variants[counters.question % variants.length];

            return base.queueSpeech ? base.queueSpeech(text, { rate: 0.9 }) : false;
        }

        function speakCorrectAnswer(number, left, right, unknownSide) {
            if (!base.isVoiceEnabled()) return false;

            const counters = base._getCounters ? base._getCounters() : { correct: 0 };
            counters.correct = (counters.correct || 0) + 1;

            const praises = ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!', 'Супер!'];
            const praise = praises[counters.correct % praises.length];

            let text = '';
            const variants = getCorrectVariants(praise, number, left, right, unknownSide);
            text = variants[counters.correct % variants.length];

            return base.queueSpeech ? base.queueSpeech(text) : false;
        }

        function speakWrongAnswer() {
            if (!base.isVoiceEnabled()) return false;
            return base.speakWrong ? base.speakWrong() : false;
        }

        function speakNumberComposition(number, floors) {
            if (!base.isVoiceEnabled()) return false;

            let text = `Число ${number} можно получить разными способами. `;
            const variants = floors.map(floor => `${floor.left} и ${floor.right}`).join(', ');
            text += variants + '. Давай попробуем решить примеры!';

            return base.queueSpeech ? base.queueSpeech(text, { rate: 0.9 }) : false;
        }

        // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

        function getQuestionVariants(number, left, right, unknownSide) {
            if (unknownSide === 'left') {
                return [
                    `Смотри, тут число ${number}. Мы знаем, что одно слагаемое - ${right}. Какое второе?`,
                    `Если к числу ${right} добавить какое-то число, получится ${number}. Что это за число?`,
                    `${right} плюс сколько будет ${number}?`,
                    `Найди недостающее число: ${right} + ? = ${number}`,
                    `Какое число нужно прибавить к ${right}, чтобы получить ${number}?`
                ];
            } else if (unknownSide === 'right') {
                return [
                    `Смотри, тут число ${number}. Мы знаем, что одно слагаемое - ${left}. Какое второе?`,
                    `Если к числу ${left} добавить какое-то число, получится ${number}. Что это за число?`,
                    `${left} плюс сколько будет ${number}?`,
                    `Найди недостающее число: ${left} + ? = ${number}`,
                    `Какое число нужно прибавить к ${left}, чтобы получить ${number}?`
                ];
            } else {
                return [
                    `Сколько будет ${left} плюс ${right}?`,
                    `Посчитай: ${left} + ${right} = ?`,
                    `Если сложить ${left} и ${right}, сколько получится?`,
                    `${left} да ${right} - это сколько вместе?`,
                    `Найди сумму чисел ${left} и ${right}`
                ];
            }
        }

        function getCorrectVariants(praise, number, left, right, unknownSide) {
            if (unknownSide === 'left') {
                return [
                    `${praise} ${number} - это ${right} и ${left}`,
                    `${praise} Чтобы получить ${number}, нужно к ${right} прибавить ${left}`,
                    `${praise} ${right} плюс ${left} как раз будет ${number}`
                ];
            } else if (unknownSide === 'right') {
                return [
                    `${praise} ${number} - это ${left} и ${right}`,
                    `${praise} Чтобы получить ${number}, нужно к ${left} прибавить ${right}`,
                    `${praise} ${left} плюс ${right} как раз будет ${number}`
                ];
            } else {
                return [
                    `${praise} ${left} плюс ${right} равно ${number}`,
                    `${praise} Сумма чисел ${left} и ${right} - это ${number}`,
                    `${praise} ${left} + ${right} = ${number}`
                ];
            }
        }

        // Собираем публичный API
        const publicAPI = {
            // Базовые методы из base
            ...base,

            // Специализированные методы
            speakQuestion,
            speakCorrectAnswer,
            speakWrongAnswer,
            speakNumberComposition,

            // Алиасы
            speakCorrect: base.speakCorrect || (() => false),
            speakWrong: base.speakWrong || (() => false),

            resetCounters: () => {
                if (base.resetCounters) base.resetCounters();
                console.log('MathVoiceService counters reset');
            },

            toggleVoice: () => {
                const newState = base.toggleVoice ? base.toggleVoice() : true;
                if (typeof GameState !== 'undefined') {
                    GameState.update('voiceEnabled', newState);
                }
                return newState;
            },

            toggleAutoVoice: () => {
                const newState = base.toggleAutoVoice ? base.toggleAutoVoice() : true;
                if (typeof GameState !== 'undefined') {
                    GameState.update('autoVoice', newState);
                }
                return newState;
            },

            stopSpeaking: () => {
                if (base.stopSpeaking) base.stopSpeaking();
            },

            isSupported: () => {
                return base.isSupported ? base.isSupported() : false;
            },

            getBrowserInfo: () => {
                return base.getBrowserInfo ? base.getBrowserInfo() : { isYandexBrowser: false };
            }
        };

        console.log('MathVoiceService initialized successfully');
        return publicAPI;

    } catch (e) {
        console.error('Error initializing MathVoiceService:', e);
        return createFallbackService();
    }

    // Функция создания fallback-сервиса
    function createFallbackService() {
        console.warn('Creating fallback voice service');

        return {
            // Базовые методы-заглушки
            isVoiceEnabled: () => false,
            isAutoVoiceEnabled: () => false,
            toggleVoice: () => false,
            toggleAutoVoice: () => false,
            queueSpeech: () => false,
            stopSpeaking: () => {},
            onQueueComplete: (cb) => { if (cb) setTimeout(cb, 10); },
            speakCorrect: () => false,
            speakWrong: () => false,
            speakQuestion: () => false,
            speakCorrectAnswer: () => false,
            speakWrongAnswer: () => false,
            speakNumberComposition: () => false,
            resetCounters: () => {},
            isSupported: () => false,
            getBrowserInfo: () => ({ isYandexBrowser: false }),
            _getCounters: () => ({ question: 0, correct: 0, wrong: 0 })
        };
    }
})();

// Глобальная переменная
window.MathVoiceService = MathVoiceService;

// Проверка инициализации
console.log('MathVoiceService loaded:', typeof window.MathVoiceService !== 'undefined');