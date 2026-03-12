// ========== UI КОМПОНЕНТЫ ==========
const UIManager = (function () {
    let gameState = null;

    function init(state) {
        gameState = state;
        state.subscribe(updateUI);
    }

    function updateUI(state) {
        $('#score-display').text(state.score);
        $('#stars-display').text(state.stars);
        $('#crowns-display').text(state.crowns);
        $('#current-level').text(state.currentLevel);

        if (state.currentMode === 'testing') {
            $('#questions-progress').text(`${state.correctAnswers}/${state.questionsToPass}`);
            $('#wrong-counter').text(state.consecutiveWrongAnswers);
        }
    }

    function showMessage(text, color) {
        $('#game-message').text(text).css('color', color);
        setTimeout(() => $('#game-message').text(''), 2000);
    }

    return {
        init,
        showMessage,
        updateUI
    };
})();