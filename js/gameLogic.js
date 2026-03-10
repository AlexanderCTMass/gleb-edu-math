// ========== ОСНОВНАЯ ИГРОВАЯ ЛОГИКА ==========
const GameLogic = (function() {
    let currentFloorIndex = 0;

    function init() {
        currentFloorIndex = 0;
        loadNumber(GameState.getProp('currentNum'));
    }

    function loadNumber(number) {
        const floors = HouseManager.generateFloors(number);
        GameState.set({ floors, selectedFloorIndex: 0, selectedSide: 'left' });

        $('#house-number').text(number);
        $('#current-number').text(number);

        setupLevel();
    }

    function setupLevel() {
        const state = GameState.get();
        const floors = HouseManager.setupLevel(state.currentLevel, [...state.floors]);
        GameState.set({ floors });

        if (state.currentLevel >= 5) {
            const unknownPos = HouseManager.showExample(
                state.currentLevel,
                state.currentNum,
                state.floors[state.selectedFloorIndex]
            );
            GameState.update('unknownPos', unknownPos);
        }

        HouseManager.renderHouse(
            state.floors,
            state.selectedFloorIndex,
            state.currentLevel
        );
    }

    function checkAnswer() {
        const state = GameState.get();

        if (state.currentLevel >= 5 && state.currentLevel <= 8) {
            return checkEquationAnswer();
        }

        const floor = state.floors[state.selectedFloorIndex];
        const isCorrect = (floor.userLeft === floor.left && floor.userRight === floor.right);

        if (isCorrect) {
            handleCorrectAnswer();
        } else {
            handleWrongAnswer();
        }
    }

    function checkEquationAnswer() {
        const state = GameState.get();
        const floor = state.floors[state.selectedFloorIndex];
        const number = state.currentNum;
        const unknownPos = state.unknownPos;
        const selectedDigit = state.selectedDigit;

        if (selectedDigit === null && selectedDigit !== 0) {
            UIManager.showMessage('Сначала перетащи цифру!', '#ffa500');
            return;
        }

        let isCorrect = false;

        if (state.currentLevel === 5) {
            isCorrect = (selectedDigit === number);
        } else if (state.currentLevel === 6) {
            isCorrect = (selectedDigit === floor.left);
        } else if (state.currentLevel === 7) {
            isCorrect = (selectedDigit === floor.right);
        } else if (state.currentLevel === 8) {
            if (unknownPos === 'left') {
                isCorrect = (selectedDigit === floor.left);
            } else if (unknownPos === 'right') {
                isCorrect = (selectedDigit === floor.right);
            } else {
                isCorrect = (selectedDigit === number);
            }
        }

        if (isCorrect) {
            $('#example-box').effect('highlight', { color: '#4caf50' }, 500);
            handleCorrectAnswer();
        } else {
            $('#example-box').effect('shake', { times: 3, distance: 5 }, 300);
            handleWrongAnswer();
        }
    }

    function handleCorrectAnswer() {
        const state = GameState.get();

        $(`.floor-row`).eq(state.selectedFloorIndex).css('background', 'rgba(76, 175, 80, 0.3)');

        GameState.update('wrongAttempts', 0);
        GameState.update('lastWrongFloor', null);
        GameState.update('lastWrongSide', null);

        if (state.selectedFloorIndex < state.floors.length - 1) {
            GameState.update('selectedFloorIndex', state.selectedFloorIndex + 1);
            GameState.update('selectedSide', 'left');

            if (state.currentLevel >= 5) {
                const floor = state.floors[state.selectedFloorIndex + 1];
                const unknownPos = HouseManager.showExample(
                    state.currentLevel,
                    state.currentNum,
                    floor
                );
                GameState.update('unknownPos', unknownPos);
            }
        } else {
            completeLevel();
            return;
        }

        GameState.incrementScore();
        UIManager.showMessage('Правильно! ✅', '#4caf50');
        CharacterManager.showCharacter('correct');

        GameState.update('selectedDigit', null);

        HouseManager.renderHouse(
            state.floors,
            state.selectedFloorIndex,
            state.currentLevel
        );
    }

    function handleWrongAnswer() {
        const state = GameState.get();

        GameState.update('wrongAttempts', state.wrongAttempts + 1);
        GameState.update('lastWrongFloor', state.selectedFloorIndex);
        GameState.update('lastWrongSide', state.selectedSide);

        $(`.floor-row`).eq(state.selectedFloorIndex).addClass('wrong-answer');
        setTimeout(() => {
            $(`.floor-row`).eq(state.selectedFloorIndex).removeClass('wrong-answer');
        }, 500);

        if (state.wrongAttempts >= 1) {
            let expectedValue;
            if (state.currentLevel >= 5) {
                const floor = state.floors[state.selectedFloorIndex];
                const number = state.currentNum;

                if (state.unknownPos === 'left') {
                    expectedValue = floor.left;
                } else if (state.unknownPos === 'right') {
                    expectedValue = floor.right;
                } else {
                    expectedValue = number;
                }
            } else {
                expectedValue = state.selectedSide === 'left' ?
                    state.floors[state.selectedFloorIndex].left :
                    state.floors[state.selectedFloorIndex].right;
            }

            UIManager.showMessage(`Подсказка: попробуй цифру ${expectedValue}`, '#ffa500');
        } else {
            UIManager.showMessage('Попробуй еще! 🤔', '#ff6b6b');
        }

        CharacterManager.showCharacter('incorrect');
    }

    function completeLevel() {
        GameState.incrementStars();

        if (GameState.getProp('currentLevel') < 8) {
            GameState.nextLevel();
            UIManager.showMessage('Уровень пройден! ⭐ +1', '#ffd700');

            GameState.update('selectedFloorIndex', 0);
            GameState.update('selectedSide', 'left');
            GameState.update('selectedDigit', null);

            setupLevel();
        } else {
            GameState.incrementCrowns();

            if (GameState.getProp('currentNum') < 10) {
                GameState.nextNumber();
                UIManager.showMessage(`Ура! Число ${GameState.getProp('currentNum')-1} освоено! 👑 +1`, '#ffd700');
                loadNumber(GameState.getProp('currentNum'));
            } else {
                UIManager.showMessage('Поздравляю! Ты прошел всю игру! 🎉', '#ffd700');
            }
        }

        $('#next-button').prop('disabled', true);
        $('#check-button').prop('disabled', false);
    }

    function resetCurrentFloor() {
        const state = GameState.get();

        if (state.currentLevel >= 5 && state.currentLevel <= 8) {
            GameState.update('selectedDigit', null);
            const floor = state.floors[state.selectedFloorIndex];
            const unknownPos = HouseManager.showExample(
                state.currentLevel,
                state.currentNum,
                floor
            );
            GameState.update('unknownPos', unknownPos);
            UIManager.showMessage('Пример сброшен', '#2196f3');
            return;
        }

        if (state.selectedFloorIndex !== null) {
            const floor = state.floors[state.selectedFloorIndex];

            if (state.currentLevel === 0 && state.selectedFloorIndex !== 0) {
                floor.userLeft = null;
                floor.userRight = null;
            } else if (state.currentLevel === 1) {
                floor.userRight = null;
            } else if (state.currentLevel === 2) {
                floor.userLeft = null;
            } else {
                floor.userLeft = null;
                floor.userRight = null;
            }

            $(`.floor-row`).eq(state.selectedFloorIndex).css('background', '');
            GameState.update('wrongAttempts', 0);

            HouseManager.renderHouse(state.floors, state.selectedFloorIndex, state.currentLevel);
            UIManager.showMessage('Этаж очищен', '#2196f3');
        }
    }

    function resetAll() {
        const state = GameState.get();

        if (state.currentLevel >= 5 && state.currentLevel <= 8) {
            GameState.update('selectedFloorIndex', 0);
            GameState.update('selectedDigit', null);
            GameState.update('wrongAttempts', 0);

            const floor = state.floors[0];
            const unknownPos = HouseManager.showExample(
                state.currentLevel,
                state.currentNum,
                floor
            );
            GameState.update('unknownPos', unknownPos);
        } else {
            const floors = HouseManager.setupLevel(state.currentLevel, [...state.floors]);
            GameState.set({ floors });
            GameState.reset();
            HouseManager.renderHouse(floors, 0, state.currentLevel);
        }

        UIManager.showMessage('Уровень начат заново', '#2196f3');
    }

    function handleDrop(target, digit) {
        const $target = $(target);
        const state = GameState.get();

        if ($target.hasClass('floor-cell')) {
            const floorIndex = $target.data('floor');
            const side = $target.data('side');
            const floor = state.floors[floorIndex];

            if (!HouseManager.isCellEditable(floorIndex, side, state.currentLevel)) {
                UIManager.showMessage('Сюда нельзя поставить цифру', '#ffa500');
                return;
            }

            if (side === 'left') {
                floor.userLeft = digit;
            } else {
                floor.userRight = digit;
            }

            GameState.update('selectedDigit', digit);

            $target.addClass('drop-success');
            setTimeout(() => $target.removeClass('drop-success'), 500);

            GameState.update('selectedFloorIndex', floorIndex);
            GameState.update('selectedSide', side);

            HouseManager.renderHouse(state.floors, floorIndex, state.currentLevel);
            UIManager.showMessage(`Цифра ${digit} на месте!`, '#4caf50');

        } else if ($target.hasClass('unknown')) {
            const id = $target.attr('id');

            GameState.update('selectedDigit', digit);

            if (id === 'example-left') {
                $('#example-left').text(digit).removeClass('unknown');
            } else if (id === 'example-right') {
                $('#example-right').text(digit).removeClass('unknown');
            } else if (id === 'example-result') {
                $('#example-result').text(digit).removeClass('unknown');
            }

            $target.addClass('drop-success');
            setTimeout(() => $target.removeClass('drop-success'), 500);

            UIManager.showMessage(`Цифра ${digit} на месте!`, '#4caf50');
        }
    }

    return {
        init,
        loadNumber,
        setupLevel,
        checkAnswer,
        resetCurrentFloor,
        resetAll,
        handleDrop
    };
})();