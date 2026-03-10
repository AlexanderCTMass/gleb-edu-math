// ========== СЕРВИС ОЗВУЧКИ С ПОМОЩЬЮ SPEECH SYNTHESIS ==========
const VoiceService = (function() {
    let synthesis = window.speechSynthesis;
    let isSpeaking = false;
    let currentUtterance = null;
    let voices = [];
    let preferredVoice = null;

    // Инициализация голосов
    function initVoices() {
        voices = synthesis.getVoices();

        // Ищем русский голос
        preferredVoice = voices.find(voice =>
            voice.lang.includes('ru') && voice.name.includes('Google')
        ) || voices.find(voice =>
            voice.lang.includes('ru')
        );

        console.log('Available voices:', voices);
        console.log('Selected voice:', preferredVoice);
    }

    // Загружаем голоса (для некоторых браузеров нужно подождать)
    if (synthesis) {
        if (synthesis.getVoices().length) {
            initVoices();
        } else {
            synthesis.addEventListener('voiceschanged', initVoices);
        }
    }

    // Функция для озвучивания текста
    function speak(text, options = {}) {
        if (!synthesis) {
            console.warn('Speech synthesis not supported');
            return false;
        }

        // Если сейчас что-то говорит, останавливаем
        if (isSpeaking) {
            stopSpeaking();
        }

        // Создаем новое сообщение
        const utterance = new SpeechSynthesisUtterance(text);
        currentUtterance = utterance;

        // Настройки
        utterance.lang = 'ru-RU';
        utterance.rate = options.rate || 0.9; // Немного медленнее для детей
        utterance.pitch = options.pitch || 1.1; // Чуть выше для приятного звучания
        utterance.volume = options.volume || 1;

        // Выбираем голос
        if (options.voice) {
            utterance.voice = options.voice;
        } else if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        // Обработчики событий
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
        };

        // Запускаем
        synthesis.speak(utterance);
        return true;
    }

    function stopSpeaking() {
        if (synthesis && isSpeaking) {
            synthesis.cancel();
            isSpeaking = false;
            currentUtterance = null;
        }
    }

    function isSupported() {
        return !!synthesis;
    }

    // Функция для озвучивания состава числа
    function speakNumberComposition(number, floors) {
        if (!isSupported()) {
            UIManager.showMessage('Озвучка не поддерживается в вашем браузере', '#ff6b6b');
            return false;
        }

        let text = `Число ${number}. `;

        // Добавляем состав числа
        text += `Его можно получить разными способами: `;

        floors.forEach((floor, index) => {
            text += `${floor.left} плюс ${floor.right}`;
            if (index < floors.length - 1) {
                text += `, `;
            } else {
                text += `. `;
            }
        });

        text += `Давай попробуем решить примеры!`;

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

    // Функция для озвучивания конкретного этажа
    function speakFloor(number, left, right) {
        if (!isSupported()) return false;

        const text = `${left} плюс ${right} равно ${number}`;

        return speak(text, {
            rate: 0.9,
            pitch: 1.1,
            onStart: () => {
                $('#speakButton').addClass('speaking');
            },
            onEnd: () => {
                $('#speakButton').removeClass('speaking');
            }
        });
    }

    // Функция для озвучивания приветствия
    function speakWelcome() {
        if (!isSupported()) return false;

        const texts = [
            'Привет! Давай изучать состав числа!',
            'Здорово! Посмотрим, как можно получить число',
            'Интересно, сколько способов мы найдём?'
        ];

        const randomText = texts[Math.floor(Math.random() * texts.length)];

        return speak(randomText, {
            rate: 0.9,
            pitch: 1.1
        });
    }

    return {
        speak,
        stopSpeaking,
        isSupported,
        speakNumberComposition,
        speakFloor,
        speakWelcome
    };
})();