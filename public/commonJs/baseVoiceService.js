// ========== БАЗОВЫЙ КЛАСС ДЛЯ СЕРВИСОВ ОЗВУЧКИ ==========
const BaseVoiceService = (function() {
    // Базовый конструктор
    function createService(gameId, config) {
        if (!gameId) throw new Error('Game ID is required');

        // Счетчики для этой игры
        const counters = {
            question: 0,
            correct: 0,
            wrong: 0
        };

        // Получение состояния из игры
        function getState(prop) {
            return config.getState ? config.getState(prop) : true;
        }

        function setState(prop, value) {
            if (config.setState) {
                config.setState(prop, value);
            }
        }

        // ========== БАЗОВЫЕ МЕТОДЫ ==========

        function isVoiceEnabled() {
            return VoiceCore.isVoiceEnabled();
        }

        function isAutoVoiceEnabled() {
            return config.getAutoVoice ? config.getAutoVoice() : true;
        }

        function toggleVoice() {
            const newState = VoiceCore.toggleVoice();
            if (config.onVoiceToggle) {
                config.onVoiceToggle(newState);
            }
            return newState;
        }

        function toggleAutoVoice() {
            const newState = !isAutoVoiceEnabled();
            if (config.setAutoVoice) {
                config.setAutoVoice(newState);
            }
            return newState;
        }

        // ========== ОЧЕРЕДЬ ==========

        function queueSpeech(text, options = {}) {
            return VoiceCore.queueSpeech(text, {
                ...options,
                gameId,
                onStart: () => {
                    if (config.onStartSpeaking) config.onStartSpeaking();
                    if (options.onStart) options.onStart();
                },
                onEnd: () => {
                    if (config.onStopSpeaking) config.onStopSpeaking();
                    if (options.onEnd) options.onEnd();
                },
                onError: (error) => {
                    if (options.onError) options.onError(error);
                }
            });
        }

        function stopSpeaking() {
            VoiceCore.stopSpeaking(gameId);
        }

        // ========== ОБЩИЕ ФРАЗЫ ==========

        function speakCorrect() {
            if (!isVoiceEnabled()) return false;

            counters.correct++;

            const praises = config.praises || [
                'Верно!', 'Правильно!', 'Молодец!', 'Отлично!', 'Здорово!', 'Супер!'
            ];
            const text = praises[counters.correct % praises.length];

            return queueSpeech(text);
        }

        function speakWrong() {
            if (!isVoiceEnabled()) return false;

            counters.wrong++;

            const texts = config.wrongMessages || [
                'Попробуй ещё раз!',
                'Не получается? Давай подумаем вместе',
                'Почти, попробуй другой вариант',
                'Не угадал. Попробуй снова'
            ];

            const text = texts[counters.wrong % texts.length];
            return queueSpeech(text);
        }

        function resetCounters() {
            counters.question = 0;
            counters.correct = 0;
            counters.wrong = 0;
        }

        function onQueueComplete(callback) {
            VoiceCore.onQueueComplete(() => {
                // Проверяем, что очередь действительно пуста для этой игры
                callback();
            });
        }

        // ========== ПУБЛИЧНЫЙ API ==========

        return {
            // Идентификация
            gameId,

            // Состояние
            isVoiceEnabled,
            isAutoVoiceEnabled,
            toggleVoice,
            toggleAutoVoice,

            // Управление очередью
            queueSpeech,
            stopSpeaking,
            onQueueComplete,

            // Общие методы
            speakCorrect,
            speakWrong,
            resetCounters,

            // Делегирование в ядро
            isSupported: VoiceCore.isSupported,
            getBrowserInfo: VoiceCore.getBrowserInfo,

            // Для отладки
            _getCounters: () => ({ ...counters })
        };
    }

    return {
        create: createService
    };
})();

window.BaseVoiceService = BaseVoiceService;