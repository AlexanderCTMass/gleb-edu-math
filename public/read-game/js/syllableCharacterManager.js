// ========== МЕНЕДЖЕР ПЕРСОНАЖЕЙ ==========
const SyllableCharacterManager = (function () {
    let currentHideTimeout = null;
    let onHideCallback = null;
    let safetyTimeout = null;
    let recentCharacters = [];
    const MAX_HISTORY_SIZE = 5;
    let isShowing = false;

    const AUTO_HIDE_DELAY = 3500;
    const SAFETY_TIMEOUT = 5000;

    function init() {
        $('#characterPopup').on('click', function () {
            manualHideCharacter();
        });
    }

    function getAvailableCharacters(reason) {
        // Используем SyllableGame.Phrases если доступно, иначе глобальные Phrases
        const phrases = (window.SyllableGame && SyllableGame.Phrases) || window.Phrases || [];
        const characters = (window.SyllableGame && SyllableGame.Characters) || window.Characters || [];

        if (!phrases.length) return [];

        let availablePhrases = phrases.filter(p => p.type === reason);

        if (availablePhrases.length === 0) {
            availablePhrases = phrases.filter(p => p.type === 'random');
        }

        const charactersMap = new Map();
        availablePhrases.forEach(phrase => {
            if (!charactersMap.has(phrase.characterId)) {
                charactersMap.set(phrase.characterId, phrase);
            }
        });

        const availableCharacters = Array.from(charactersMap.entries())
            .filter(([characterId]) => !recentCharacters.includes(characterId))
            .map(([characterId, phrase]) => ({
                characterId,
                phrase
            }));

        return availableCharacters;
    }

    function showCharacter(reason = 'correct', callback) {
        if (isShowing) {
            if (callback) setTimeout(callback, 100);
            return false;
        }

        let availableCharacters = getAvailableCharacters(reason);

        if (availableCharacters.length === 0) {
            recentCharacters = [];
            availableCharacters = getAvailableCharacters(reason);
        }

        if (availableCharacters.length === 0) {
            if (callback) setTimeout(callback, 100);
            return false;
        }

        const randomIndex = Math.floor(Math.random() * availableCharacters.length);
        const selected = availableCharacters[randomIndex];
        const characters = (window.SyllableGame && SyllableGame.Characters) || window.Characters || [];
        const character = characters.find(c => c.id === selected.characterId);

        return showCharacterWithDetails(character, selected.phrase, callback);
    }

    function showCharacterWithDetails(character, phrase, callback) {
        if (!character) {
            console.error('Character not found');
            if (callback) setTimeout(callback, 100);
            return false;
        }

        isShowing = true;
        onHideCallback = callback;

        recentCharacters.push(character.id);
        if (recentCharacters.length > MAX_HISTORY_SIZE) {
            recentCharacters.shift();
        }

        const characterImg = typeof ResourceManager !== 'undefined' ?
            ResourceManager.getImage(character.id) : null;

        if (characterImg && characterImg instanceof Image) {
            $('#characterImage').attr('src', characterImg.src);
        } else {
            $('#characterImage').attr('src', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23ffd700"/><text x="50" y="70" font-size="50" text-anchor="middle" fill="white">👤</text></svg>');
        }

        const audio = typeof ResourceManager !== 'undefined' ?
            ResourceManager.getAudio(phrase.id) : null;

        if (audio) {
            audio.play().catch(e => console.log('Аудио не воспроизвелось:', e));
        }

        const popup = $('#characterPopup');
        popup.removeClass('show from-right');

        if (Math.random() > 0.5) {
            popup.addClass('show from-right');
        } else {
            popup.addClass('show');
        }

        if (currentHideTimeout) clearTimeout(currentHideTimeout);
        currentHideTimeout = setTimeout(() => {
            hideCharacter();
        }, AUTO_HIDE_DELAY);

        if (safetyTimeout) clearTimeout(safetyTimeout);
        safetyTimeout = setTimeout(() => {
            if ($('#characterPopup').hasClass('show')) {
                hideCharacter();
            }
        }, SAFETY_TIMEOUT);

        return true;
    }

    function hideCharacter() {
        if (currentHideTimeout) {
            clearTimeout(currentHideTimeout);
            currentHideTimeout = null;
        }

        if (safetyTimeout) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;
        }

        $('#characterPopup').removeClass('show from-right');

        const callback = onHideCallback;
        onHideCallback = null;
        isShowing = false;

        if (callback) {
            try {
                callback();
            } catch (e) {
                console.error('Error in character callback:', e);
            }
        }
    }

    function manualHideCharacter() {
        if ($('#characterPopup').hasClass('show')) {
            hideCharacter();
        }
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
        isShowing = false;
    }

    // Инициализация при загрузке
    setTimeout(init, 100);

    return {
        showCharacter,
        startRandomTimer,
        hideCharacter,
        resetHistory,
        manualHideCharacter
    };
})();

window.SyllableCharacterManager = SyllableCharacterManager;