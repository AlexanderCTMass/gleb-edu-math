
// ========== СЕРВИС ДЛЯ МАТЕМАТИЧЕСКОЙ ИГРЫ ==========
const MathVoiceService = (function() {
    // Счетчики для разнообразия
    let questionCounter = 0;
    let correctCounter = 0;
    let wrongCounter = 0;

    // Получение состояния автоозвучки из игры
    function getAutoVoiceState() {
        if (typeof SyllableGameState !== 'undefined' && SyllableGameState.get) {
            return SyllableGameState.getProp('autoVoice');
        }
        if (typeof GameState !== 'undefined' && GameState.get) {
            return GameState.getProp('autoVoice');
        }
        return true;
    }

    function setAutoVoiceState(enabled) {
        if (typeof SyllableGameState !== 'undefined' && SyllableGameState.get) {
            SyllableGameState.update('autoVoice', enabled);
        }
        if (typeof GameState !== 'undefined' && GameState.get) {
            GameState.update('autoVoice', enabled);
        }
    }

    function toggleAutoVoice() {
        const newState = !getAutoVoiceState();
        setAutoVoiceState(newState);
        return newState;
    }

    // ========== МЕТОДЫ ДЛЯ МАТЕМАТИЧЕСКОЙ ИГРЫ ==========

    function speakQuestion(number, left, right, unknownSide) {
        if (!VoiceCoreService.isVoiceEnabled()) return false;

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

        return VoiceCoreService.queueSpeech(text, { rate: 0.9 });
    }

    function speakCorrectAnswer(number, left, right, unknownSide) {
        if (!VoiceCoreService.isVoiceEnabled()) return false;

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

        return VoiceCoreService.queueSpeech(text);
    }

    function speakNumberComposition(number, floors) {
        if (!VoiceCoreService.isVoiceEnabled()) return false;

        let text = `Число ${number} можно получить разными способами. `;

        const variants = floors.map(floor => `${floor.left} и ${floor.right}`).join(', ');
        text += variants + '. ';

        text += 'Давай попробуем решить примеры!';

        return VoiceCoreService.queueSpeech(text, {
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

    function speakCorrect() {
        if (!VoiceCoreService.isVoiceEnabled()) return false;

        correctCounter++;

        const praises = ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!', 'Супер!'];
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
            'Не угадал. Попробуй снова',
            'Не верно. Давай попробуем другую цифру'
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
        // Основные методы для математической игры
        speakQuestion,
        speakCorrectAnswer,
        speakNumberComposition,
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

window.MathVoiceService = MathVoiceService;
