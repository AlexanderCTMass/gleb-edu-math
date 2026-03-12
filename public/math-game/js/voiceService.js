// ========== СЕРВИС ДЛЯ МАТЕМАТИЧЕСКОЙ ИГРЫ ==========
const MathVoiceService = (function() {
    // Проверяем, что BaseVoiceService доступен
    if (typeof BaseVoiceService === 'undefined') {
        console.error('BaseVoiceService not found!');
        return null;
    }

    // Создаем экземпляр базового сервиса
    const base = BaseVoiceService.create('mathGame', {
        // Получение состояний
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

        // Автоозвучка
        getAutoVoice: () => {
            return typeof GameState !== 'undefined' ?
                GameState.getProp('autoVoice') : true;
        },
        setAutoVoice: (value) => {
            if (typeof GameState !== 'undefined') {
                GameState.update('autoVoice', value);
            }
        },

        // Колбэки для UI
        onStartSpeaking: () => {
            $('#speakButton').addClass('speaking');
        },
        onStopSpeaking: () => {
            $('#speakButton').removeClass('speaking');
        },
        onVoiceToggle: (enabled) => {
            // Синхронизируем с GameState
            if (typeof GameState !== 'undefined') {
                GameState.update('voiceEnabled', enabled);
            }
        }
    });

    if (!base) {
        console.error('Failed to create base voice service');
        return null;
    }

    // ========== СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ ==========

    function speakQuestion(number, left, right, unknownSide) {
        if (!base.isVoiceEnabled()) return false;

        const counters = base._getCounters();
        counters.question++;

        let text = '';
        const variants = getQuestionVariants(number, left, right, unknownSide);
        text = variants[counters.question % variants.length];

        return base.queueSpeech(text, { rate: 0.9 });
    }

    function speakCorrectAnswer(number, left, right, unknownSide) {
        if (!base.isVoiceEnabled()) return false;

        const counters = base._getCounters();
        counters.correct++;

        const praises = ['Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!', 'Супер!'];
        const praise = praises[counters.correct % praises.length];

        let text = '';
        const variants = getCorrectVariants(praise, number, left, right, unknownSide);
        text = variants[counters.correct % variants.length];

        return base.queueSpeech(text);
    }

    function speakWrongAnswer() {
        if (!base.isVoiceEnabled()) return false;
        return base.speakWrong();
    }

    function speakNumberComposition(number, floors) {
        if (!base.isVoiceEnabled()) return false;

        let text = `Число ${number} можно получить разными способами. `;
        const variants = floors.map(floor => `${floor.left} и ${floor.right}`).join(', ');
        text += variants + '. Давай попробуем решить примеры!';

        return base.queueSpeech(text, { rate: 0.9 });
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

    // ========== ПУБЛИЧНЫЙ API ==========

    // Проверяем, что все необходимые методы существуют
    const publicAPI = {
        // Базовые методы из base
        ...base,

        // Специализированные методы
        speakQuestion,
        speakCorrectAnswer,
        speakWrongAnswer,
        speakNumberComposition,

        // Алиасы для обратной совместимости
        speakCorrect: base.speakCorrect,
        speakWrong: base.speakWrong,

        // Переопределяем методы, если нужно
        resetCounters: () => {
            base.resetCounters();
            console.log('MathVoiceService counters reset');
        },

        // Дополнительные методы для совместимости с основным кодом
        toggleVoice: () => {
            const newState = base.toggleVoice();
            if (typeof GameState !== 'undefined') {
                GameState.update('voiceEnabled', newState);
            }
            return newState;
        },

        toggleAutoVoice: () => {
            const newState = base.toggleAutoVoice();
            if (typeof GameState !== 'undefined') {
                GameState.update('autoVoice', newState);
            }
            return newState;
        },

        stopSpeaking: () => {
            base.stopSpeaking();
        },

        isSupported: () => {
            return base.isSupported();
        },

        getBrowserInfo: () => {
            return base.getBrowserInfo();
        }
    };

    // Проверяем наличие всех методов
    const requiredMethods = ['queueSpeech', 'stopSpeaking', 'isVoiceEnabled',
        'isAutoVoiceEnabled', 'toggleVoice', 'toggleAutoVoice',
        'speakCorrect', 'speakWrong', 'resetCounters',
        'onQueueComplete', 'isSupported', 'getBrowserInfo'];

    for (const method of requiredMethods) {
        if (typeof publicAPI[method] === 'undefined') {
            console.error(`MathVoiceService missing required method: ${method}`);
        }
    }

    return publicAPI;
})();

// Глобальная переменная для обратной совместимости
window.MathVoiceService = MathVoiceService;

// Дополнительная проверка при загрузке
if (typeof window.MathVoiceService === 'undefined') {
    console.error('MathVoiceService failed to initialize');
}