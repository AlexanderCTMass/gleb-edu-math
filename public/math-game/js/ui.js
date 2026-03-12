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

    // Константы
    const AUTO_HIDE_DELAY = 3500;
    const SAFETY_TIMEOUT = 5000;

    function init() {
        console.log('SyllableCharacterManager initialized');
        $('#characterPopup').on('click', function () {
            console.log('Character popup clicked - manual close');
            manualHideCharacter();
        });
    }

    function canShowCharacter(characterId) {
        const lastTime = GameState.getProp('lastCharacterTime');
        const now = Date.now();
        const minInterval = GameState.getProp('minIntervalBetweenCharacters');

        if (now - lastTime <= minInterval) {
            console.log('Cannot show character - too soon');
            return false;
        }

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
            safeCallback(callback);
        }
    }

    function manualHideCharacter() {
        if ($('#characterPopup').hasClass('show')) {
            console.log('Manual character close');
            wasManuallyClosed = true;
            hideCharacter();
        }
    }

    function safeCallback(callback) {
        if (typeof callback === 'function') {
            try {
                callback();
            } catch (e) {
                console.error('Error in character callback:', e);
            }
        }
    }

    function showCharacter(reason = 'correct', callback) {
        if (isShowing) {
            console.log('Character already showing, skipping');
            if (callback) safeCallback(callback);
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

        let availableCharacters = getAvailableCharacters(reason);

        if (availableCharacters.length === 0) {
            console.log('No available characters, resetting history');
            recentCharacters = [];
            availableCharacters = getAvailableCharacters(reason);
        }

        if (availableCharacters.length === 0) {
            console.log('Taking any available character');
            let anyPhrases = Phrases.filter(p => p.type === reason);
            if (anyPhrases.length === 0) {
                anyPhrases = Phrases.filter(p => p.type === 'random');
            }

            if (anyPhrases.length === 0) {
                console.log('No phrases available, calling callback directly');
                isShowing = false;
                if (callback) safeCallback(callback);
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
        if (!character) {
            console.error('Character not found for phrase:', phrase);
            isShowing = false;
            if (callback) safeCallback(callback);
            return false;
        }

        if (!canShowCharacter(character.id)) {
            console.log('Cannot show character due to time check');
            isShowing = false;
            if (callback) safeCallback(callback);
            return false;
        }

        console.log('Showing character:', character.name);

        onHideCallback = callback;
        GameState.update('lastCharacterTime', Date.now());
        addToRecent(character.id);

        // Показываем изображение с правильной обработкой
        const characterImg = ResourceManager.getImage(character.id);
        const $characterImage = $('#characterImage');

        if (characterImg && characterImg instanceof Image) {
            $characterImage.attr('src', characterImg.src);
        } else {
            console.warn('Invalid image for character:', character.id);
            // Устанавливаем заглушку
            $characterImage.attr('src', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23ffd700"/><text x="50" y="70" font-size="50" text-anchor="middle" fill="white">👤</text></svg>');
        }

        // Проигрываем аудио
        const audio = ResourceManager.getAudio(phrase.id);
        if (audio) {
            audio.play().catch(e => {
                console.log('Аудио не воспроизвелось:', e);
                // Пробуем воспроизвести через голосовой движок как запасной вариант
                if (typeof MathVoiceService !== 'undefined' && MathVoiceService.isVoiceEnabled()) {
                    MathVoiceService.queueSpeech('', { silent: true }); // Заглушка
                }
            });
        } else if (typeof MathVoiceService !== 'undefined' && MathVoiceService.isVoiceEnabled()) {
            // Если нет аудиофайла, используем голосовой движок
            MathVoiceService.queueSpeech('Молодец!', { rate: 0.9 });
        }

        const popup = $('#characterPopup');
        popup.removeClass('show from-right');

        if (Math.random() > 0.5) {
            popup.addClass('show from-right');
        } else {
            popup.addClass('show');
        }

        currentHideTimeout = setTimeout(() => {
            console.log('Auto-hide timeout triggered');
            hideCharacter();
        }, AUTO_HIDE_DELAY);

        safetyTimeout = setTimeout(() => {
            console.log('Safety timeout - forcing character hide');
            if ($('#characterPopup').hasClass('show')) {
                hideCharacter();
            }
        }, SAFETY_TIMEOUT);

        return true;
    }

    function startRandomTimer() {
        setInterval(() => {
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