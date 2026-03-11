// ========== ОСНОВНАЯ ЛОГИКА ИГРЫ СО СЛОГАМИ ==========
const SyllableGameLogic = (function() {
    let currentQuestionSyllable = null;
    let currentOptions = [];
    let isWaitingForCharacter = false;
    let isWaitingForVoice = false;

    function init() {
        loadLevel();
    }

    function loadLevel() {
        const state = SyllableGameState.get();
        const level = SyllableLevels.find(l => l.id === state.currentLevel);

        $('#level-name').text(level.name);
        $('#current-level').text(state.currentLevel);

        if (state.currentMode === 'learning') {
            setupLearningMode();
        } else {
            setupTestingMode();
        }

        updateUI();
    }

    function setupLearningMode() {
        $('#learningMode').show();
        $('#testingMode').hide();
        $('#nextSyllableBtn').show();
        $('#optionsContainer').hide();

        const state = SyllableGameState.get();
        const level = SyllableLevels.find(l => l.id === state.currentLevel);
        const syllable = level.syllables[state.currentSyllableIndex];

        $('#current-syllable').text(syllable);

        // Автоматически озвучиваем слог
        if (SyllableGameState.getProp('autoVoice')) {
            setTimeout(() => speakSyllable(syllable), 300);
        }
    }

    function setupTestingMode() {
        $('#learningMode').hide();
        $('#testingMode').show();
        $('#nextSyllableBtn').hide();
        $('#optionsContainer').show();

        generateQuestion();
    }

    function generateQuestion() {
        const state = SyllableGameState.get();
        const level = SyllableLevels.find(l => l.id === state.currentLevel);

        // Выбираем случайный слог из изученных
        const availableSyllables = [...level.syllables];
        currentQuestionSyllable = availableSyllables[Math.floor(Math.random() * availableSyllables.length)];

        // Генерируем варианты ответов (правильный + 3 других)
        const otherSyllables = availableSyllables.filter(s => s !== currentQuestionSyllable);
        const shuffled = shuffleArray([...otherSyllables]);
        currentOptions = [currentQuestionSyllable, ...shuffled.slice(0, 3)];
        currentOptions = shuffleArray(currentOptions);

        // Отображаем варианты
        $('#option1').text(currentOptions[0]);
        $('#option2').text(currentOptions[1]);
        $('#option3').text(currentOptions[2]);
        $('#option4').text(currentOptions[3]);

        // Озвучиваем вопрос
        if (SyllableGameState.getProp('autoVoice')) {
            setTimeout(() => speakCurrentQuestion(), 500);
        }

        // Сбрасываем выделения
        $('.option-btn').removeClass('correct-highlight wrong-highlight disabled');
    }

    function speakCurrentQuestion() {
        if (currentQuestionSyllable) {
            VoiceService.queueSpeech(`Найди слог ${currentQuestionSyllable}`, {
                rate: 0.9,
                onStart: () => console.log('Speaking question...')
            });
        }
    }

    function speakSyllable(syllable) {
        VoiceService.queueSpeech(syllable, {
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

    function nextSyllable() {
        if (isWaitingForCharacter) return;

        const state = SyllableGameState.get();
        const level = SyllableLevels.find(l => l.id === state.currentLevel);
        const currentSyllable = level.syllables[state.currentSyllableIndex];

        // Отмечаем слог как изученный
        SyllableGameState.markSyllableAsMastered(currentSyllable);

        // Переходим к следующему слогу
        const hasNext = SyllableGameState.nextSyllable();

        if (!hasNext) {
            // Все слоги уровня изучены - переходим к тестированию
            UIManager.showMessage('Отлично! А теперь проверка! ⭐', '#4caf50');
            SyllableGameState.enterTestingMode();
        }

        // Обновляем отображение
        loadLevel();
    }

    function selectOption(selectedSyllable) {
        const state = SyllableGameState.get();

        if (state.currentMode !== 'testing') return;
        if (isWaitingForCharacter || isWaitingForVoice) return;

        const isCorrect = (selectedSyllable === currentQuestionSyllable);

        // Блокируем кнопки
        $('.option-btn').addClass('disabled');
        isWaitingForCharacter = true;

        if (isCorrect) {
            // Правильный ответ
            $(`.option-btn:contains('${selectedSyllable}')`).addClass('correct-highlight');

            SyllableGameState.handleCorrectAnswer();

            // Озвучиваем поздравление
            if (SyllableGameState.getProp('voiceEnabled')) {
                VoiceService.speakCorrectAnswer();
            }

            // Показываем персонажа
            CharacterManager.showCharacter('correct', () => {
                // Проверяем, достаточно ли правильных ответов для завершения уровня
                if (SyllableGameState.shouldCompleteLevel()) {
                    UIManager.showMessage('Уровень пройден! ⭐ +1', '#ffd700');
                    SyllableGameState.completeLevel();
                    loadLevel();
                } else {
                    // Следующий вопрос
                    generateQuestion();
                }
                isWaitingForCharacter = false;
            });

        } else {
            // Неправильный ответ
            $(`.option-btn:contains('${selectedSyllable}')`).addClass('wrong-highlight');

            // Подсвечиваем правильный ответ
            $(`.option-btn:contains('${currentQuestionSyllable}')`).addClass('correct-highlight');

            SyllableGameState.handleWrongAnswer();

            // Озвучиваем ошибку и правильный ответ
            if (SyllableGameState.getProp('voiceEnabled')) {
                VoiceService.speakWrongAnswer();
                setTimeout(() => {
                    VoiceService.queueSpeech(`Правильный слог: ${currentQuestionSyllable}`, {
                        rate: 0.9
                    });
                }, 800);
            }

            // Проверяем, не пора ли вернуться к обучению
            if (SyllableGameState.shouldReturnToLearning()) {
                UIManager.showMessage('Давай ещё раз поучим слоги 📖', '#ff9800');
                SyllableGameState.enterLearningMode();
                loadLevel();
                isWaitingForCharacter = false;
            } else {
                // Просто переходим к следующему вопросу
                setTimeout(() => {
                    generateQuestion();
                    isWaitingForCharacter = false;
                }, 2000);
            }
        }

        updateUI();
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function updateUI() {
        const state = SyllableGameState.get();
        $('#score-display').text(state.score);
        $('#stars-display').text(state.stars);
        $('#crowns-display').text(state.crowns);

        if (state.currentMode === 'testing') {
            $('#questions-progress').text(`${state.correctAnswers}/${state.questionsToPass}`);
            $('#wrong-counter').text(state.consecutiveWrongAnswers);
        }
    }

    return {
        init,
        loadLevel,
        nextSyllable,
        selectOption,
        speakCurrentSyllable: () => {
            const syllable = $('#current-syllable').text();
            if (syllable) speakSyllable(syllable);
        },
        speakCurrentQuestion
    };
})();