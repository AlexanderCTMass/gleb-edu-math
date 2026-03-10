// ========== UI КОМПОНЕНТЫ ==========
const UIManager = (function() {
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
const CharacterManager = (function() {
    function canShowCharacter() {
        const lastTime = GameState.getProp('lastCharacterTime');
        const now = Date.now();
        const minInterval = GameState.getProp('minIntervalBetweenCharacters');

        if (now - lastTime > minInterval) {
            GameState.update('lastCharacterTime', now);
            return true;
        }
        return false;
    }

    function showCharacter(reason = 'correct') {
        if (!canShowCharacter()) return;

        let availablePhrases = Phrases.filter(p => p.type === reason);
        if (availablePhrases.length === 0) {
            availablePhrases = Phrases.filter(p => p.type === 'random');
        }

        const randomPhrase = availablePhrases[Math.floor(Math.random() * availablePhrases.length)];
        const character = Characters.find(c => c.id === randomPhrase.characterId);

        if (!character) return;

        const characterImg = ResourceManager.getImage(character.id);
        if (characterImg) {
            $('#characterImage').attr('src', characterImg.src);
        }

        const audio = ResourceManager.getAudio(randomPhrase.id);
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

        setTimeout(() => {
            popup.removeClass('show from-right');
            if (audio && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        }, 4000);
    }

    function startRandomTimer() {
        setInterval(() => {
            if (Math.random() < 0.1) {
                showCharacter('random');
            }
        }, 120000);
    }

    return {
        showCharacter,
        startRandomTimer
    };
})();