// ========== МЕНЕДЖЕР ПЕРСОНАЖЕЙ ==========
const CharacterManager = (function () {
    let currentHideTimeout = null;
    let onHideCallback = null;
    let safetyTimeout = null;
    let recentCharacters = [];
    const MAX_HISTORY_SIZE = 5;
    let isShowing = false;

    function init() {
        $('#characterPopup').on('click', function () {
            manualHideCharacter();
        });
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

        // Получаем доступных персонажей
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
        const character = Characters.find(c => c.id === selected.characterId);

        return showCharacterWithDetails(character, selected.phrase, callback);
    }

    function showCharacterWithDetails(character, phrase, callback) {
        isShowing = true;
        onHideCallback = callback;

        // Добавляем в историю
        recentCharacters.push(character.id);
        if (recentCharacters.length > MAX_HISTORY_SIZE) {
            recentCharacters.shift();
        }

        // Показываем изображение
        const characterImg = ResourceManager.getImage(character.id);
        if (characterImg) {
            $('#characterImage').attr('src', characterImg.src);
        }

        // Проигрываем аудио
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

        // Автоматическое скрытие
        if (currentHideTimeout) clearTimeout(currentHideTimeout);
        currentHideTimeout = setTimeout(() => {
            hideCharacter();
        }, 3500);

        // Safety таймер
        if (safetyTimeout) clearTimeout(safetyTimeout);
        safetyTimeout = setTimeout(() => {
            if ($('#characterPopup').hasClass('show')) {
                hideCharacter();
            }
        }, 5000);

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
            callback();
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

    init();

    return {
        showCharacter,
        startRandomTimer,
        hideCharacter,
        resetHistory,
        manualHideCharacter
    };
})();