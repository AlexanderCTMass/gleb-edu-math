// ========== СЕРВИС ДЛЯ СЛОГОВОЙ ИГРЫ ==========
const SyllableVoiceService = (function() {
    console.log('Initializing SyllableVoiceService...');

    // Проверяем наличие BaseVoiceService
    if (typeof BaseVoiceService === 'undefined') {
        console.error('BaseVoiceService not found! Creating fallback...');
        return createFallbackService();
    }

    try {
        // Создаем экземпляр базового сервиса
        const base = BaseVoiceService.create('syllableGame', {
            getState: (prop) => {
                if (typeof SyllableGameState !== 'undefined') {
                    return SyllableGameState.getProp(prop);
                }
                return null;
            },
            setState: (prop, value) => {
                if (typeof SyllableGameState !== 'undefined') {
                    SyllableGameState.update(prop, value);
                }
            },
            getAutoVoice: () => {
                return typeof SyllableGameState !== 'undefined' ?
                    SyllableGameState.getProp('autoVoice') : true;
            },
            setAutoVoice: (value) => {
                if (typeof SyllableGameState !== 'undefined') {
                    SyllableGameState.update('autoVoice', value);
                }
            },
            onStartSpeaking: () => {
                $('#speakSyllableBtn').addClass('speaking');
            },
            onStopSpeaking: () => {
                $('#speakSyllableBtn').removeClass('speaking');
            },
            praises: ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!'],
            wrongMessages: [
                'Попробуй другой слог',
                'Не угадал, попробуй ещё раз',
                'Почти, давай подумаем вместе',
                'Этот слог не подходит, попробуй другой'
            ]
        });

        if (!base) {
            console.error('Failed to create base voice service');
            return createFallbackService();
        }

        // ========== СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ ==========

        function speakQuestion(syllable, word) {
            if (!base.isVoiceEnabled()) return false;

            const counters = base._getCounters ? base._getCounters() : { question: 0 };
            counters.question = (counters.question || 0) + 1;

            const variants = [
                `Какой слог пропущен в слове ${word}?`,
                `Найди пропущенный слог в слове ${word}`,
                `Какой слог нужно добавить, чтобы получилось слово ${word}?`,
                `В слове ${word} пропущен слог. Какой?`
            ];
            const text = variants[counters.question % variants.length];

            return base.queueSpeech ? base.queueSpeech(text, { rate: 0.9 }) : false;
        }

        function speakCorrectAnswer(syllable, word) {
            if (!base.isVoiceEnabled()) return false;

            const counters = base._getCounters ? base._getCounters() : { correct: 0 };
            counters.correct = (counters.correct || 0) + 1;

            const praises = ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!'];
            const praise = praises[counters.correct % praises.length];

            const variants = [
                `${praise} Слог "${syllable}" - правильный ответ!`,
                `${praise} Ты правильно выбрал слог "${syllable}" в слове ${word}`,
                `${praise} "${syllable}" - верно!`
            ];

            const text = variants[counters.correct % variants.length];
            return base.queueSpeech ? base.queueSpeech(text) : false;
        }

        function speakWrongAnswer(correctSyllable) {
            if (!base.isVoiceEnabled()) return false;

            const counters = base._getCounters ? base._getCounters() : { wrong: 0 };
            counters.wrong = (counters.wrong || 0) + 1;

            const variants = [
                'Попробуй другой слог',
                'Не угадал, попробуй ещё раз',
                'Почти, давай подумаем вместе',
                'Этот слог не подходит, попробуй другой'
            ];

            const text = variants[counters.wrong % variants.length];
            return base.queueSpeech ? base.queueSpeech(text) : false;
        }

        function speakLearning(syllable, word) {
            if (!base.isVoiceEnabled()) return false;

            const counters = base._getCounters ? base._getCounters() : { learning: 0 };
            counters.learning = (counters.learning || 0) + 1;

            const variants = [
                `Слог "${syllable}" встречается в слове ${word}`,
                `"${syllable}" sil<[500]> ${word}`,
                `${word} - этот слог "${syllable}"`,
                `Запомни: слог "${syllable}" есть в слове ${word}`
            ];

            const text = variants[counters.learning % variants.length];
            return base.queueSpeech ? base.queueSpeech(text, { rate: 0.8 }) : false;
        }

        // Собираем публичный API
        const publicAPI = {
            ...base,
            speakQuestion,
            speakCorrectAnswer,
            speakWrongAnswer,
            speakLearning,
            speakCorrect: base.speakCorrect || (() => false),
            speakWrong: base.speakWrong || (() => false),
            resetCounters: () => {
                if (base.resetCounters) base.resetCounters();
            },
            toggleVoice: () => {
                const newState = base.toggleVoice ? base.toggleVoice() : true;
                if (typeof SyllableGameState !== 'undefined') {
                    SyllableGameState.update('voiceEnabled', newState);
                }
                return newState;
            },
            toggleAutoVoice: () => {
                const newState = base.toggleAutoVoice ? base.toggleAutoVoice() : true;
                if (typeof SyllableGameState !== 'undefined') {
                    SyllableGameState.update('autoVoice', newState);
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

        console.log('SyllableVoiceService initialized successfully');
        return publicAPI;

    } catch (e) {
        console.error('Error initializing SyllableVoiceService:', e);
        return createFallbackService();
    }

    function createFallbackService() {
        console.warn('Creating fallback voice service for syllable game');
        return {
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
            speakLearning: () => false,
            resetCounters: () => {},
            isSupported: () => false,
            getBrowserInfo: () => ({ isYandexBrowser: false })
        };
    }
})();

window.SyllableVoiceService = SyllableVoiceService;