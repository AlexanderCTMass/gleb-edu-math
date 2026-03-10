// ========== СЕРВИС ОЗВУЧКИ С ПОДДЕРЖКОЙ ОЧЕРЕДИ ==========
const VoiceService = (function() {
    let synthesis = window.speechSynthesis;
    let isSpeaking = false;
    let currentUtterance = null;
    let voices = [];
    let preferredVoice = null;

    // Очередь озвучки
    let speechQueue = [];
    let isProcessingQueue = false;

    // Колбэк для отслеживания завершения
    let onQueueCompleteCallback = null;

    // Счетчики для разнообразия
    let questionCounter = 0;
    let correctCounter = 0;
    let wrongCounter = 0;

    // Инициализация голосов
    function initVoices() {
        voices = synthesis.getVoices();

        // Ищем русский голос
        preferredVoice = voices.find(voice =>
            voice.lang.includes('ru') && voice.name.includes('Google')
        ) || voices.find(voice =>
            voice.lang.includes('ru')
        );

        console.log('Selected voice:', preferredVoice);
    }

    // Загружаем голоса
    if (synthesis) {
        if (synthesis.getVoices().length) {
            initVoices();
        } else {
            synthesis.addEventListener('voiceschanged', initVoices);
        }
    }

    // Проверка, включена ли озвучка
    function isVoiceEnabled() {
        return GameState.getProp('voiceEnabled');
    }

    // Функция для добавления в очередь
    function queueSpeech(text, options = {}) {
        if (!isVoiceEnabled()) {
            console.log('Voice is disabled, skipping:', text);
            if (options.onEnd) options.onEnd();
            return false;
        }

        speechQueue.push({
            text,
            options
        });

        console.log('Added to queue, queue length:', speechQueue.length);
        processQueue();
        return true;
    }

    // Обработка очереди
    function processQueue() {
        if (isProcessingQueue || speechQueue.length === 0 || !isVoiceEnabled()) {
            if (speechQueue.length === 0 && onQueueCompleteCallback) {
                const callback = onQueueCompleteCallback;
                onQueueCompleteCallback = null;
                callback();
            }
            return;
        }

        isProcessingQueue = true;
        const next = speechQueue.shift();

        speakNow(next.text, {
            ...next.options,
            onEnd: () => {
                isProcessingQueue = false;
                if (next.options.onEnd) next.options.onEnd();
                processQueue();
            }
        });
    }

    // Немедленное воспроизведение (внутреннее)
    function speakNow(text, options = {}) {
        if (!synthesis || !isVoiceEnabled()) {
            if (options.onEnd) options.onEnd();
            return false;
        }

        // Если сейчас что-то говорит, останавливаем
        if (isSpeaking) {
            stopSpeaking();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        currentUtterance = utterance;

        utterance.lang = 'ru-RU';
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1.1;
        utterance.volume = options.volume || 1;

        if (options.voice) {
            utterance.voice = options.voice;
        } else if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onstart = function() {
            isSpeaking = true;
            console.log('Started speaking:', text);
            if (options.onStart) options.onStart();
        };

        utterance.onend = function() {
            isSpeaking = false;
            currentUtterance = null;
            console.log('Finished speaking');
            if (options.onEnd) options.onEnd();
        };

        utterance.onerror = function(event) {
            isSpeaking = false;
            currentUtterance = null;
            console.error('Speech error:', event);
            if (options.onError) options.onError(event);
            if (options.onEnd) options.onEnd();
        };

        synthesis.speak(utterance);
        return true;
    }

    // Публичный метод для озвучивания (с очередью)
    function speak(text, options = {}) {
        return queueSpeech(text, options);
    }

    function stopSpeaking() {
        if (synthesis) {
            synthesis.cancel();
            isSpeaking = false;
            currentUtterance = null;
        }
        // Очищаем очередь
        speechQueue = [];
        isProcessingQueue = false;
        onQueueCompleteCallback = null;
    }

    function isSupported() {
        return !!synthesis;
    }

    // ========== РАЗНООБРАЗНЫЕ ВОПРОСЫ ==========

    // Озвучка вопроса для текущего этажа
    function speakQuestion(number, left, right, unknownSide) {
        if (!isVoiceEnabled()) return false;

        questionCounter++;
        let text = '';

        // Вариации в зависимости от того, что неизвестно
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

        return speak(text, {
            rate: 0.9,
            pitch: 1.1
        });
    }

    // Озвучка правильного ответа
    function speakCorrectAnswer(number, left, right, unknownSide) {
        if (!isVoiceEnabled()) return false;

        correctCounter++;
        let text = '';

        // Базовые похвалы
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

        return speak(text);
    }

    // Озвучка неправильного ответа
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

        const randomText = texts[wrongCounter % texts.length];
        return speak(randomText);
    }

    // Озвучка состава числа (для уровня 0)
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

        // Строим список вариантов
        const variants = [];
        floors.forEach((floor) => {
            variants.push(`${floor.left} и ${floor.right}`);
        });

        // Разные способы перечисления
        const listStyles = [
            () => {
                // Простой список через запятую
                return variants.join(', ') + '. ';
            },
            () => {
                // С "можно получить как"
                return 'можно получить как ' + variants.join(', или как ') + '. ';
            },
            () => {
                // С "это"
                return 'это ' + variants.join(', также это ') + '. ';
            }
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

        return speak(text, {
            rate: 0.9,
            pitch: 1.1,
            onStart: () => {
                $('#speakButton').addClass('speaking');
                UIManager.showMessage('Слушаем...', '#4caf50');
            },
            onEnd: () => {
                $('#speakButton').removeClass('speaking');
                UIManager.showMessage('', '');
            }
        });
    }

    // Озвучка конкретного этажа
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
        return speak(text);
    }

    // Установка колбэка на завершение всей очереди
    function onQueueComplete(callback) {
        onQueueCompleteCallback = callback;
    }

    // Сброс счетчиков (можно вызывать при смене числа)
    function resetCounters() {
        questionCounter = 0;
        correctCounter = 0;
        wrongCounter = 0;
    }

    return {
        speak,
        stopSpeaking,
        isSupported,
        speakNumberComposition,
        speakFloor,
        speakQuestion,
        speakCorrectAnswer,
        speakWrongAnswer,
        onQueueComplete,
        isVoiceEnabled,
        resetCounters
    };
})();