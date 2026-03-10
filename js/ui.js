// ========== UI КОМПОНЕНТЫ ==========
const UIManager = (function () {
    function init() {
        GameState.subscribe(updateUI);
    }

    function updateUI(state) {
        $('#score-display').text(state.score);
        $('#stars-display').text(state.stars);
        $('#crowns-display').text(state.crowns);
        $('#current-level').text(state.currentLevel);
        $('#current-number').text(state.currentNum);
        $('#house-number').text(state.currentNum);
    }

    function showMessage(text, color) {
        $('#game-message').text(text).css('color', color);
        setTimeout(() => $('#game-message').text(''), 1500);
    }

    return {
        init,
        showMessage,
        updateUI
    };
})();

// ========== МЕНЕДЖЕР ПЕРСОНАЖЕЙ ==========
const CharacterManager = (function () {
    let currentHideTimeout = null;
    let onHideCallback = null;
    let safetyTimeout = null;

    // История последних показанных персонажей (храним их id)
    let recentCharacters = [];
    const MAX_HISTORY_SIZE = 5; // Храним последних 3 персонажей

    // Статистика показов каждого персонажа
    let characterStats = {};

    // Флаг, указывающий, был ли персонаж закрыт досрочно по клику
    let wasManuallyClosed = false;

    function init() {
        console.log('CharacterManager initialized');
        // Добавляем обработчик клика по персонажу
        $('#characterPopup').on('click', function () {
            console.log('Character popup clicked - manual close');
            manualHideCharacter();
        });
    }

    function canShowCharacter(characterId) {
        const lastTime = GameState.getProp('lastCharacterTime');
        const now = Date.now();
        const minInterval = GameState.getProp('minIntervalBetweenCharacters');

        // Проверяем временной интервал
        if (now - lastTime <= minInterval) {
            console.log('Cannot show character - too soon');
            return false;
        }

        // Проверяем, не был ли этот персонаж показан в последних 3-х разах
        if (recentCharacters.includes(characterId)) {
            console.log(`Character ${characterId} was shown recently, skipping`);
            return false;
        }

        return true;
    }

    // Добавляем персонажа в историю
    function addToRecent(characterId) {
        recentCharacters.push(characterId);

        // Обновляем статистику
        characterStats[characterId] = (characterStats[characterId] || 0) + 1;

        // Оставляем только последние MAX_HISTORY_SIZE записей
        if (recentCharacters.length > MAX_HISTORY_SIZE) {
            recentCharacters.shift();
        }

        console.log('Recent characters:', recentCharacters);
    }

    // Получаем доступных персонажей для указанной причины
    function getAvailableCharacters(reason) {
        // Находим все фразы для данной причины
        let availablePhrases = Phrases.filter(p => p.type === reason);

        // Если нет фраз для данной причины, берем случайные
        if (availablePhrases.length === 0) {
            availablePhrases = Phrases.filter(p => p.type === 'random');
        }

        // Группируем по персонажам (берем по одной фразе на персонажа)
        const charactersMap = new Map();
        availablePhrases.forEach(phrase => {
            if (!charactersMap.has(phrase.characterId)) {
                charactersMap.set(phrase.characterId, phrase);
            }
        });

        // Фильтруем персонажей, которые не были в последних показах
        const availableCharacters = Array.from(charactersMap.entries())
            .filter(([characterId, phrase]) => !recentCharacters.includes(characterId))
            .map(([characterId, phrase]) => ({
                characterId,
                phrase
            }));

        return availableCharacters;
    }

    function hideCharacter() {
        console.log('Hiding character, wasManuallyClosed:', wasManuallyClosed);

        if (safetyTimeout) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;
        }

        if (currentHideTimeout) {
            clearTimeout(currentHideTimeout);
            currentHideTimeout = null;
        }

        const popup = $('#characterPopup');
        popup.removeClass('show from-right');

        const audioElements = document.getElementsByTagName('audio');
        for (let audio of audioElements) {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        }

        // Сохраняем колбэк и флаг перед сбросом
        const callback = onHideCallback;
        const wasManual = wasManuallyClosed;

        // Сбрасываем флаг и колбэк
        wasManuallyClosed = false;
        onHideCallback = null;

        // Вызываем колбэк если он есть
        if (callback) {
            console.log('Executing hide callback, wasManual:', wasManual);
            callback();
        }
    }

    function manualHideCharacter() {
        if ($('#characterPopup').hasClass('show')) {
            console.log('Manual character close');
            wasManuallyClosed = true;
            hideCharacter();
        }
    }

    function showCharacter(reason = 'correct', callback) {
        console.log('Showing character for reason:', reason);

        // Очищаем предыдущие таймеры
        if (currentHideTimeout) {
            clearTimeout(currentHideTimeout);
            currentHideTimeout = null;
        }

        if (safetyTimeout) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;
        }

        // Сбрасываем флаг ручного закрытия
        wasManuallyClosed = false;

        // Получаем доступных персонажей
        const availableCharacters = getAvailableCharacters(reason);

        if (availableCharacters.length === 0) {
            console.log('No available characters (all recent)');
            // Если все персонажи были недавно, сбрасываем историю и пробуем снова
            if (recentCharacters.length > 0) {
                console.log('Resetting recent characters history');
                recentCharacters = [];
                // Повторно получаем доступных персонажей
                const retryAvailable = getAvailableCharacters(reason);
                if (retryAvailable.length > 0) {
                    return showCharacterWithSelection(reason, callback, retryAvailable);
                }
            }

            // Если все равно никого нет, берем любого
            console.log('Taking any available character');
            let anyPhrases = Phrases.filter(p => p.type === reason);
            if (anyPhrases.length === 0) {
                anyPhrases = Phrases.filter(p => p.type === 'random');
            }

            if (anyPhrases.length === 0) {
                console.log('No phrases available, calling callback directly');
                if (callback) callback();
                return false;
            }

            const randomPhrase = anyPhrases[Math.floor(Math.random() * anyPhrases.length)];
            const character = Characters.find(c => c.id === randomPhrase.characterId);
            return showCharacterWithDetails(character, randomPhrase, reason, callback);
        }

        return showCharacterWithSelection(reason, callback, availableCharacters);
    }

    function showCharacterWithSelection(reason, callback, availableCharacters) {
        // Выбираем случайного персонажа из доступных
        const randomIndex = Math.floor(Math.random() * availableCharacters.length);
        const selected = availableCharacters[randomIndex];
        const character = Characters.find(c => c.id === selected.characterId);

        return showCharacterWithDetails(character, selected.phrase, reason, callback);
    }

    function showCharacterWithDetails(character, phrase, reason, callback) {
        // Проверяем временной интервал
        if (!canShowCharacter(character.id)) {
            console.log('Cannot show character due to time/recent check');
            if (callback) setTimeout(callback, 2000);
            return false;
        }

        console.log('Showing character:', character.name);

        // Сохраняем колбэк
        onHideCallback = callback;

        // Обновляем время последнего показа
        GameState.update('lastCharacterTime', Date.now());

        // Добавляем персонажа в историю
        addToRecent(character.id);

        // Показываем персонажа
        const characterImg = ResourceManager.getImage(character.id);
        if (characterImg) {
            $('#characterImage').attr('src', characterImg.src);
        }

        const audio = ResourceManager.getAudio(phrase.id);
        if (audio) {
            audio.play().catch(e => console.log('Аудио не воспроизвелось:', e));
        }

        const popup = $('#characterPopup');
        popup.removeClass('show from-right');

        // Случайная сторона появления
        if (Math.random() > 0.5) {
            popup.addClass('show from-right');
        } else {
            popup.addClass('show');
        }

        // Таймер на скрытие персонажа (автоматическое скрытие)
        currentHideTimeout = setTimeout(() => {
            console.log('Auto-hide timeout triggered');
            hideCharacter();
        }, 4000);

        // Safety таймер - на случай если что-то пойдет не так
        safetyTimeout = setTimeout(() => {
            console.log('Safety timeout - forcing character hide');
            if ($('#characterPopup').hasClass('show')) {
                hideCharacter();
            }
        }, 5000);

        return true;
    }

    function startRandomTimer() {
        setInterval(() => {
            if (Math.random() < 0.1) {
                showCharacter('random');
            }
        }, 20000); // Каждые 2 минуты
    }

    // Функция для сброса истории (можно вызывать при переходе на новое число)
    function resetHistory() {
        recentCharacters = [];
        characterStats = {};
        console.log('Character history reset');
    }

    // Функция для получения статистики
    function getStats() {
        return {
            recent: [...recentCharacters],
            stats: {...characterStats}
        };
    }

    // Инициализируем обработчики
    init();

    return {
        showCharacter,
        startRandomTimer,
        hideCharacter,
        resetHistory,
        getStats,
        manualHideCharacter // Экспортируем для возможности вызова из консоли
    };
})();