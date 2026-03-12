// ========== СЕРВИС ДЛЯ СЛОГОВОЙ ИГРЫ ==========
const SyllableVoiceService = (function() {
    // Создаем экземпляр базового сервиса
    const base = BaseVoiceService.create('syllableGame', {
        // Получение состояний
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

        // Автоозвучка
        getAutoVoice: () => {
            return typeof SyllableGameState !== 'undefined' ?
                SyllableGameState.getProp('autoVoice') : true;
        },
        setAutoVoice: (value) => {
            if (typeof SyllableGameState !== 'undefined') {
                SyllableGameState.update('autoVoice', value);
            }
        },

        // Колбэки для UI
        onStartSpeaking: () => {
            $('#syllableSpeakButton').addClass('speaking');
        },
        onStopSpeaking: () => {
            $('#syllableSpeakButton').removeClass('speaking');
        },

        // Специфичные для игры фразы
        praises: ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!'],
        wrongMessages: [
            'Попробуй другой слог',
            'Не угадал, попробуй ещё раз',
            'Почти, давай подумаем вместе',
            'Этот слог не подходит, попробуй другой'
        ]
    });

    // ========== СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ ==========

    function speakQuestion(syllable, word, position) {
        if (!base.isVoiceEnabled()) return false;

        const counters = base._getCounters();
        counters.question++;

        const variants = [
            `Какой слог пропущен в слове ${word}?`,
            `Найди пропущенный слог в слове ${word}`,
            `Какой слог нужно добавить, чтобы получилось слово ${word}?`,
            `В слове ${word} пропущен слог. Какой?`
        ];
        const text = variants[counters.question % variants.length];

        return base.queueSpeech(text, { rate: 0.9 });
    }

    function speakCorrectAnswer(syllable, word) {
        if (!base.isVoiceEnabled()) return false;

        const counters = base._getCounters();
        counters.correct++;

        const praises = base._getConfig().praises;
        const praise = praises[counters.correct % praises.length];

        const variants = [
            `${praise} Слог "${syllable}" - правильный ответ!`,
            `${praise} Ты правильно выбрал слог "${syllable}" в слове ${word}`,
            `${praise} "${syllable}" - верно!`
        ];

        const text = variants[counters.correct % variants.length];
        return base.queueSpeech(text);
    }

    function speakWrongAnswer(correctSyllable) {
        if (!base.isVoiceEnabled()) return false;

        const counters = base._getCounters();
        counters.wrong++;

        const variants = [
            'Попробуй другой слог',
            'Не угадал, попробуй ещё раз',
            'Почти, давай подумаем вместе',
            'Этот слог не подходит, попробуй другой',
            correctSyllable ? `Нет, это не "${correctSyllable}"?` : 'Попробуй другой вариант'
        ];

        const text = variants[counters.wrong % variants.length];
        return base.queueSpeech(text);
    }

    function speakLearning(syllable, word) {
        if (!base.isVoiceEnabled()) return false;

        const counters = base._getCounters();

        const variants = [
            `Слог "${syllable}" встречается в слове ${word}`,
            `Послушай: "${syllable}" - ${word}`,
            `${word} - этот слог "${syllable}"`,
            `Запомни: слог "${syllable}" есть в слове ${word}`
        ];

        const text = variants[counters.question % variants.length];

        return base.queueSpeech(text, { rate: 0.8 });
    }

    // ========== ПУБЛИЧНЫЙ API ==========

    return {
        // Базовые методы
        ...base,

        // Специализированные методы
        speakQuestion,
        speakCorrectAnswer,
        speakWrongAnswer,
        speakLearning,

        // Алиасы для обратной совместимости
        speakCorrect: base.speakCorrect,
        speakWrong: base.speakWrong
    };
})();

window.SyllableVoiceService = SyllableVoiceService;