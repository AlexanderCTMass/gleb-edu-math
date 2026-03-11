// ========== ОСНОВНАЯ ИГРОВАЯ ЛОГИКА ==========
const GameLogic = (function () {
    let nextTimer = null;
    let currentOptions = [];
    let correctAnswer = null;
    let unknownSide = null;
    let isWaitingForCharacter = false;
    let isCorrectAnswerPending = false;
    let isWaitingForVoice = false;

    // Счетчик правильных ответов для появления персонажа
    let correctAnswersCount = 0;
    // Интервал появления персонажей (каждые 3-5 правильных ответов)
    const CHARACTER_SHOW_INTERVAL = 4; // По умолчанию каждый 4-й правильный ответ

    function init() {
        loadNumber(GameState.getProp('currentNum'));
    }

    function loadNumber(number) {
        const floors = HouseManager.generateFloors(number);
        GameState.set({floors, selectedFloorIndex: 0});

        $('#house-number').text(number);
        $('#current-number').text(number);

        // Сбрасываем счетчики для нового числа
        VoiceService.resetCounters();
        correctAnswersCount = 0;

        setupLevel();
    }

    function setupLevel() {
        const state = GameState.get();
        const floors = HouseManager.setupLevel(state.currentLevel, [...state.floors]);
        GameState.set({ floors });

        // Сбрасываем флаги
        isCorrectAnswerPending = false;
        isWaitingForCharacter = false;
        isWaitingForVoice = false;

        // Для уровня 0
        if (state.currentLevel === 0) {
            $('#optionsContainer').hide();
            $('#nextCounter').hide();
            $('#speakButton').show();
            showNextButton();

            HouseManager.renderHouse(
                state.floors,
                state.selectedFloorIndex,
                state.currentLevel,
                null
            );

        } else {
            $('#optionsContainer').show();
            $('#nextCounter').show();
            $('#next-button').hide();
            $('#speakButton').hide();

            determineUnknownSide();

            if (state.currentLevel >= 5) {
                HouseManager.showExample(
                    state.currentLevel,
                    state.currentNum,
                    state.floors[state.selectedFloorIndex],
                    unknownSide
                );
            } else {
                HouseManager.renderHouse(
                    state.floors,
                    state.selectedFloorIndex,
                    state.currentLevel,
                    unknownSide
                );
            }

            generateOptions();
            enableOptions();

            // Автоматически озвучиваем вопрос
            if (GameState.getProp('autoVoice')) {
                setTimeout(() => speakCurrentQuestion(), 300);
            }
        }
    }

    // Озвучка текущего вопроса
    function speakCurrentQuestion() {
        const state = GameState.get();
        if (state.currentLevel === 0) return;

        const floor = state.floors[state.selectedFloorIndex];
        VoiceService.speakQuestion(state.currentNum, floor.left, floor.right, unknownSide);
    }

    function showNextButton() {
        const bottomSection = $('.bottom-section');
        if ($('#next-button').length === 0) {
            const nextBtn = $('<button>', {
                id: 'next-button',
                class: 'next-level-btn',
                text: 'Дальше →'
            }).click(function () {
                moveToNextFloor();
            });
            bottomSection.append(nextBtn);
        } else {
            $('#next-button').show();
        }
    }

    function determineUnknownSide() {
        const state = GameState.get();
        const floor = state.floors[state.selectedFloorIndex];
        const level = state.currentLevel;

        if (level <= 4) {
            if (level === 1) {
                unknownSide = 'right';
            } else if (level === 2) {
                unknownSide = 'left';
            } else if (level === 3) {
                unknownSide = 'left';
            } else if (level === 4) {
                unknownSide = 'right';
            }
        } else {
            if (level === 5) {
                unknownSide = 'result';
            } else if (level === 6) {
                unknownSide = 'left';
            } else if (level === 7) {
                unknownSide = 'right';
            } else if (level === 8) {
                const floorIndex = state.selectedFloorIndex;
                const sides = ['left', 'right', 'result'];
                unknownSide = sides[floorIndex % 3];
            }
        }
    }

    function generateOptions() {
        const state = GameState.get();
        const floor = state.floors[state.selectedFloorIndex];
        const number = state.currentNum;

        if (unknownSide === 'left') {
            correctAnswer = floor.left;
        } else if (unknownSide === 'right') {
            correctAnswer = floor.right;
        } else if (unknownSide === 'result') {
            correctAnswer = number;
        }

        currentOptions = generateRandomOptions(correctAnswer, 0, 9);

        $('#option1').text(currentOptions[0]);
        $('#option2').text(currentOptions[1]);
        $('#option3').text(currentOptions[2]);

        $('.option-btn').removeClass('correct-highlight wrong-highlight');
    }

    function generateRandomOptions(correct, min, max) {
        const options = [correct];

        while (options.length < 3) {
            const random = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!options.includes(random)) {
                options.push(random);
            }
        }

        return shuffleArray(options);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function disableOptions() {
        $('.option-btn').addClass('disabled');
    }

    function enableOptions() {
        $('.option-btn').removeClass('disabled');
    }

    function showConfetti() {
        const duration = 1500;
        const animationEnd = Date.now() + duration;
        const defaults = {startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000};

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                ...defaults,
                particleCount,
                origin: {x: randomInRange(0.1, 0.3), y: Math.random() - 0.2}
            });
            confetti({
                ...defaults,
                particleCount,
                origin: {x: randomInRange(0.7, 0.9), y: Math.random() - 0.2}
            });
        }, 250);
    }

    // Завершение правильного ответа
    function completeCorrectAnswer() {
        console.log('Completing correct answer, moving to next floor');
        isWaitingForCharacter = false;
        isCorrectAnswerPending = false;
        isWaitingForVoice = false;
        moveToNextFloor();
    }

    // Завершение неправильного ответа
    function completeIncorrectAnswer() {
        console.log('Completing incorrect answer');
        isWaitingForCharacter = false;
        isWaitingForVoice = false;
        setTimeout(() => {
            $('.option-btn').removeClass('wrong-highlight');
            enableOptions();
        }, 500);
    }

    function selectOption(selectedValue) {
        const state = GameState.get();

        if (state.currentLevel === 0) return;
        if (isWaitingForCharacter || isCorrectAnswerPending || isWaitingForVoice) return;

        const isCorrect = (selectedValue === correctAnswer);

        // Блокируем кнопки
        disableOptions();
        isWaitingForCharacter = true;

        if (isCorrect) {
            isCorrectAnswerPending = true;
            correctAnswersCount++;

            $(`.option-btn:contains('${selectedValue}')`).addClass('correct-highlight');
            updateUnknownWithAnswer(selectedValue);
            showConfetti();
            GameState.incrementScore();

            // ВСЕГДА озвучиваем правильный ответ (голосом)
            if (GameState.getProp('voiceEnabled')) {
                const floor = state.floors[state.selectedFloorIndex];
                VoiceService.speakCorrectAnswer(state.currentNum, floor.left, floor.right, unknownSide);
            }

            // Решаем, показывать ли персонажа (каждые 3-5 правильных ответов)
            const shouldShowCharacter = (correctAnswersCount % CHARACTER_SHOW_INTERVAL === 0);

            if (shouldShowCharacter) {
                console.log(`Showing character after ${correctAnswersCount} correct answers`);
                CharacterManager.showCharacter('correct', function () {
                    console.log('Character callback executed');

                    // После исчезновения персонажа проверяем, не ждем ли мы еще озвучку
                    if (GameState.getProp('voiceEnabled')) {
                        isWaitingForVoice = true;
                        VoiceService.onQueueComplete(function() {
                            console.log('Voice queue completed after character');
                            completeCorrectAnswer();
                        });
                    } else {
                        completeCorrectAnswer();
                    }
                });
            } else {
                console.log(`No character this time (${correctAnswersCount} correct answers)`);
                // Персонажа не показываем, просто ждем окончания озвучки
                if (GameState.getProp('voiceEnabled')) {
                    isWaitingForVoice = true;
                    VoiceService.onQueueComplete(function() {
                        console.log('Voice queue completed without character');
                        completeCorrectAnswer();
                    });
                } else {
                    completeCorrectAnswer();
                }
            }

            // Таймер безопасности
            setTimeout(() => {
                if (isCorrectAnswerPending) {
                    console.log('Correct answer timeout - forcing completion');
                    completeCorrectAnswer();
                }
            }, 8000);

        } else {
            // НЕПРАВИЛЬНЫЙ ОТВЕТ
            $(`.option-btn:contains('${selectedValue}')`).addClass('wrong-highlight');

            // Озвучиваем неправильный ответ (всегда)
            if (GameState.getProp('voiceEnabled')) {
                VoiceService.speakWrongAnswer();
            }

            // Персонажей при неправильных ответах НЕ показываем (или показываем редко)
            // Можно раскомментировать, если хотите показывать иногда
            // if (Math.random() < 0.3) { // 30% шанс
            //     CharacterManager.showCharacter('incorrect', function () {
            //         completeIncorrectAnswer();
            //     });
            // } else {
            //     completeIncorrectAnswer();
            // }

            // Просто завершаем без персонажа
            setTimeout(() => {
                completeIncorrectAnswer();
            }, 1500);

            // Таймер безопасности
            setTimeout(() => {
                if (isWaitingForCharacter) {
                    console.log('Incorrect answer timeout - forcing completion');
                    completeIncorrectAnswer();
                }
            }, 5000);
        }
    }

    function updateUnknownWithAnswer(answer) {
        const state = GameState.get();

        if (state.currentLevel <= 4) {
            const floor = state.floors[state.selectedFloorIndex];

            if (unknownSide === 'left') {
                floor.userLeft = answer;
            } else if (unknownSide === 'right') {
                floor.userRight = answer;
            }

            const cell = $(`.floor-row:eq(${state.selectedFloorIndex}) .floor-cell[data-side="${unknownSide}"]`);
            cell.text(answer).removeClass('empty unknown').addClass('filled');

        } else {
            if (unknownSide === 'left') {
                $('#example-left').text(answer).removeClass('unknown');
            } else if (unknownSide === 'right') {
                $('#example-right').text(answer).removeClass('unknown');
            } else if (unknownSide === 'result') {
                $('#example-result').text(answer).removeClass('unknown');
            }
        }
    }

    function moveToNextFloor() {
        const state = GameState.get();

        if (state.selectedFloorIndex < state.floors.length - 1) {
            const nextIndex = state.selectedFloorIndex + 1;
            GameState.update('selectedFloorIndex', nextIndex);

            if (state.currentLevel === 0) {
                HouseManager.renderHouse(
                    state.floors,
                    nextIndex,
                    state.currentLevel,
                    null
                );
            } else {
                determineUnknownSide();

                if (state.currentLevel >= 5) {
                    HouseManager.showExample(
                        state.currentLevel,
                        state.currentNum,
                        state.floors[nextIndex],
                        unknownSide
                    );
                } else {
                    HouseManager.renderHouse(
                        state.floors,
                        nextIndex,
                        state.currentLevel,
                        unknownSide
                    );
                }

                $('.option-btn').removeClass('disabled correct-highlight wrong-highlight');
                generateOptions();
                enableOptions();

                if (GameState.getProp('autoVoice')) {
                    setTimeout(() => speakCurrentQuestion(), 500);
                }
            }

        } else {
            completeLevel();
        }
    }

    function resetCurrentFloor() {
        const state = GameState.get();

        if (state.currentLevel === 0) return;

        const floor = state.floors[state.selectedFloorIndex];

        floor.userLeft = null;
        floor.userRight = null;

        determineUnknownSide();

        if (state.currentLevel >= 5) {
            HouseManager.showExample(
                state.currentLevel,
                state.currentNum,
                floor,
                unknownSide
            );
        } else {
            HouseManager.renderHouse(
                state.floors,
                state.selectedFloorIndex,
                state.currentLevel,
                unknownSide
            );
        }

        $('.option-btn').removeClass('disabled correct-highlight wrong-highlight');
        generateOptions();
        enableOptions();

        UIManager.showMessage('Этаж сброшен', '#2196f3');
    }

    function completeLevel() {
        GameState.incrementStars();

        if (GameState.getProp('currentLevel') < 8) {
            GameState.nextLevel();
            UIManager.showMessage('Уровень пройден! ⭐ +1', '#ffd700');

            GameState.update('selectedFloorIndex', 0);

            if (GameState.getProp('currentLevel') > 0) {
                $('#optionsContainer').show();
                $('#nextCounter').show();
                $('#next-button').hide();
            }

            setupLevel();
        } else {
            GameState.incrementCrowns();

            if (GameState.getProp('currentNum') < 10) {
                GameState.nextNumber();
                UIManager.showMessage(`Ура! Число ${GameState.getProp('currentNum') - 1} освоено! 👑 +1`, '#ffd700');

                VoiceService.resetCounters();
                correctAnswersCount = 0;

                loadNumber(GameState.getProp('currentNum'));
            } else {
                UIManager.showMessage('Поздравляю! Ты прошел всю игру! 🎉', '#ffd700');
            }
        }
    }

    return {
        init,
        loadNumber,
        setupLevel,
        selectOption,
        resetCurrentFloor,
        enableOptions,
        disableOptions,
        speakCurrentQuestion
    };
})();