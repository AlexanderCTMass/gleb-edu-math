// ========== СЕРВИС ДЛЯ СЛОГОВОЙ ИГРЫ ==========
const SyllableVoiceService = (function() {
    // Счетчики для разнообразия
    let questionCounter = 0;
    let correctCounter = 0;
    let wrongCounter = 0;

    // Получение состояния автоозвучки из игры
    function getAutoVoiceState() {
        if (typeof SyllableGameState !== 'undefined' && SyllableGameState.get) {
            return SyllableGameState.getProp('autoVoice');
        }
        return true;
    }

    function setAutoVoiceState(enabled) {
        if (typeof SyllableGameState !== 'undefined' && SyllableGameState.get) {
            SyllableGameState.update('autoVoice', enabled);
        }
    }

    function toggleAutoVoice() {
        const newState = !getAutoVoiceState();
        setAutoVoiceState(newState);
        return newState;
    }

    // ========== МЕТОДЫ ДЛЯ СЛОГОВОЙ ИГРЫ ==========

    function speakQuestion(syllable, word, position) {
        if (!VoiceCoreService.isVoiceEnabled()) return false;

        questionCounter++;
        let text = '';

        const variants = [
            `Какой слог пропущен в слове ${word}?`,
            `Найди пропущенный слог в слове ${word}`,
            `Какой слог нужно добавить, чтобы получилось слово ${word}?`,
            `В слове ${word} пропущен слог. Какой?`
        ];
        text = variants[questionCounter % variants.length];

        return VoiceCoreService.queueSpeech(text, { rate: 0.9 });
    }

    function speakCorrectAnswer(syllable, word) {
        if (!VoiceCoreService.isVoiceEnabled()) return false;

        correctCounter++;

        const praises = ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!'];
        const praise = praises[correctCounter % praises.length];

        const variants = [
            `${praise} Слог "${syllable}" - правильный ответ!`,
            `${praise} Ты правильно выбрал слог "${syllable}" в слове ${word}`,
            `${praise} "${syllable}" - верно!`
        ];

        const text = variants[correctCounter % variants.length];
        return VoiceCoreService.queueSpeech(text);
    }

    function speakWrongAnswer(correctSyllable) {
        if (!VoiceCoreService.isVoiceEnabled()) return false;

        wrongCounter++;

        const variants = [
            'Попробуй другой слог',
            'Не угадал, попробуй ещё раз',
            'Почти, давай подумаем вместе',
            'Этот слог не подходит, попробуй другой',
            `Нет, это не "${correctSyllable}"?`
        ];

        const text = variants[wrongCounter % variants.length];
        return VoiceCoreService.queueSpeech(text);
    }

    function speakLearning(syllable, word) {
        if (!VoiceCoreService.isVoiceEnabled()) return false;

        const variants = [
            `Слог "${syllable}" встречается в слове ${word}`,
            `Послушай: "${syllable}" - ${word}`,
            `${word} - этот слог "${syllable}"`,
            `Запомни: слог "${syllable}" есть в слове ${word}`
        ];

        const text = variants[questionCounter % variants.length];

        return VoiceCoreService.queueSpeech(text, {
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

    function speakCorrect() {
        if (!VoiceCoreService.isVoiceEnabled()) return false;

        correctCounter++;

        const praises = ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!'];
        const text = praises[correctCounter % praises.length];

        return VoiceCoreService.queueSpeech(text);
    }

    function speakWrong() {
        if (!VoiceCoreService.isVoiceEnabled()) return false;

        wrongCounter++;

        const texts = [
            'Попробуй ещё раз!',
            'Не получается? Давай подумаем вместе',
            'Почти, попробуй другой вариант',
            'Не угадал. Попробуй снова'
        ];

        const text = texts[wrongCounter % texts.length];
        return VoiceCoreService.queueSpeech(text);
    }

    function resetCounters() {
        questionCounter = 0;
        correctCounter = 0;
        wrongCounter = 0;
    }

    return {
        // Основные методы для слоговой игры
        speakQuestion,
        speakCorrectAnswer,
        speakWrongAnswer,
        speakLearning,
        speakCorrect,
        speakWrong,

        // Управление
        toggleAutoVoice,
        getAutoVoiceState,
        resetCounters,

        // Делегированные методы из ядра
        stopSpeaking: VoiceCoreService.stopSpeaking,
        isVoiceEnabled: VoiceCoreService.isVoiceEnabled,
        toggleVoice: VoiceCoreService.toggleVoice,
        onQueueComplete: VoiceCoreService.onQueueComplete
    };
})();

window.SyllableVoiceService = SyllableVoiceService;
