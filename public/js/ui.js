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

    // История последних показанных персонажей
    let recentCharacters = [];
    const MAX_HISTORY_SIZE = 5;

    // Статистика показов
    let characterStats = {};

    // Флаг ручного закрытия
    let wasManuallyClosed = false;

    // Защита от множественных вызовов
    let isShowing = false;

    function init() {
        console.log('CharacterManager initialized');
        $('#characterPopup').on('click', function () {
            console.log('Character popup clicked - manual close');
            manualHideCharacter();
        });
    }

    function canShowCharacter(characterId) {
        const lastTime = GameState.getProp('lastCharacterTime');
        const now = Date.now();
        const minInterval = GameState.getProp('minIntervalBetweenCharacters');

        // Проверяем временной интервал (минимум 8 секунд между персонажами)
        if (now - lastTime <= minInterval) {
            console.log('Cannot show character - too soon');
            return false;
        }

        // Проверяем, не был ли этот персонаж показан недавно
        if (recentCharacters.includes(characterId)) {
            console.log(`Character ${characterId} was shown recently, skipping`);
            return false;
        }

        return true;
    }

    function addToRecent(characterId) {
        recentCharacters.push(characterId);
        characterStats[characterId] = (characterStats[characterId] || 0) + 1;

        if (recentCharacters.length > MAX_HISTORY_SIZE) {
            recentCharacters.shift();
        }

        console.log('Recent characters:', recentCharacters);
    }

    function getAvailableCharacters(reason) {
        let availablePhrases = Phrases.filter(p => p.type === reason);

        if (availablePhrases.length === 0) {
            availablePhrases = Phrases.filter(p => p.type === 'random');
        }

        const charactersMap = new Map();
        availablePhrases.forEach(phrase => {
            if (!charactersMap.has(phrase.characterId)) {
                charactersMap.set(phrase.characterId, phrase);
            }
        });

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

        // Останавливаем все аудио
        const audioElements = document.getElementsByTagName('audio');
        for (let audio of audioElements) {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        }

        const callback = onHideCallback;
        const wasManual = wasManuallyClosed;

        wasManuallyClosed = false;
        onHideCallback = null;
        isShowing = false;

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
        // Защита от множественных вызовов
        if (isShowing) {
            console.log('Character already showing, skipping');
            if (callback) setTimeout(callback, 100);
            return false;
        }

        console.log('Showing character for reason:', reason);

        if (currentHideTimeout) {
            clearTimeout(currentHideTimeout);
            currentHideTimeout = null;
        }

        if (safetyTimeout) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;
        }

        wasManuallyClosed = false;
        isShowing = true;

        // Получаем доступных персонажей
        let availableCharacters = getAvailableCharacters(reason);

        // Если нет доступных, пробуем сбросить историю
        if (availableCharacters.length === 0) {
            console.log('No available characters, resetting history');
            recentCharacters = [];
            availableCharacters = getAvailableCharacters(reason);
        }

        // Если все равно нет, берем любого
        if (availableCharacters.length === 0) {
            console.log('Taking any available character');
            let anyPhrases = Phrases.filter(p => p.type === reason);
            if (anyPhrases.length === 0) {
                anyPhrases = Phrases.filter(p => p.type === 'random');
            }

            if (anyPhrases.length === 0) {
                console.log('No phrases available, calling callback directly');
                isShowing = false;
                if (callback) setTimeout(callback, 100);
                return false;
            }

            const randomPhrase = anyPhrases[Math.floor(Math.random() * anyPhrases.length)];
            const character = Characters.find(c => c.id === randomPhrase.characterId);
            return showCharacterWithDetails(character, randomPhrase, reason, callback);
        }

        const randomIndex = Math.floor(Math.random() * availableCharacters.length);
        const selected = availableCharacters[randomIndex];
        const character = Characters.find(c => c.id === selected.characterId);

        return showCharacterWithDetails(character, selected.phrase, reason, callback);
    }

    function showCharacterWithDetails(character, phrase, reason, callback) {
        // Проверяем временной интервал
        if (!canShowCharacter(character.id)) {
            console.log('Cannot show character due to time check');
            isShowing = false;
            if (callback) setTimeout(callback, 100);
            return false;
        }

        console.log('Showing character:', character.name);

        onHideCallback = callback;
        GameState.update('lastCharacterTime', Date.now());
        addToRecent(character.id);

        // Показываем изображение
        const characterImg = ResourceManager.getImage(character.id);
        if (characterImg) {
            $('#characterImage').attr('src', characterImg.src);
        }

        // Проигрываем аудио (фразу персонажа)
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

        // Автоматическое скрытие через 3.5 секунды
        currentHideTimeout = setTimeout(() => {
            console.log('Auto-hide timeout triggered');
            hideCharacter();
        }, 3500);

        // Safety таймер
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
            // 10% шанс каждые 30 секунд
            if (Math.random() < 0.1 && !isShowing) {
                showCharacter('random');
            }
        }, 30000);
    }

    function resetHistory() {
        recentCharacters = [];
        characterStats = {};
        isShowing = false;
        console.log('Character history reset');
    }

    function getStats() {
        return {
            recent: [...recentCharacters],
            stats: {...characterStats}
        };
    }

    // Инициализация
    init();

    return {
        showCharacter,
        startRandomTimer,
        hideCharacter,
        resetHistory,
        getStats,
        manualHideCharacter
    };
})();