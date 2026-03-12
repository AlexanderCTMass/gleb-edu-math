// ========== ОСНОВНАЯ ЛОГИКА ИГРЫ СО СЛОГАМИ ==========
const SyllableGameLogic = (function() {
    let currentQuestionSyllable = null;
    let currentQuestionWord = null;
    let currentOptions = [];
    let isWaitingForCharacter = false;
    let isWaitingForVoice = false;
    let characterTimeout = null;

    // ========== ИНИЦИАЛИЗАЦИЯ ==========

    function init() {
        loadLevel();
    }

    function loadLevel() {
        const state = SyllableGameState.get();
        const level = SyllableLevels.find(l => l.id === state.currentLevel);

        if (!level) {
            console.error('Level not found:', state.currentLevel);
            return;
        }

        $('#level-name').text(level.name);
        $('#current-level').text(state.currentLevel);
        $('#total-levels').text('/8');

        // Обновляем статистику
        updateStats();

        if (state.currentMode === 'learning') {
            setupLearningMode();
        } else {
            setupTestingMode();
        }

        updateUI();
    }

    // ========== РЕЖИМ ОБУЧЕНИЯ ==========

    function setupLearningMode() {
        $('#learningMode').show();
        $('#testingMode').hide();
        $('#nextSyllableBtn').show();
        $('#optionsContainer').hide();
        $('#repeatQuestionBtn').hide();
        $('#speakSyllableBtn').show();

        const state = SyllableGameState.get();
        const level = SyllableLevels.find(l => l.id === state.currentLevel);

        if (!level) return;

        const syllable = level.syllables[state.currentSyllableIndex];
        const word = level.words[state.currentSyllableIndex];

        $('#current-syllable').text(syllable);
        $('#example-word').text(word);
        $('#syllable-count').text(`${state.currentSyllableIndex + 1}/${level.syllables.length}`);

        // Подсвечиваем слог в слове
        highlightSyllableInWord(syllable, word);

        // Автоматически озвучиваем слог
        if (SyllableGameState.getProp('autoVoice')) {
            setTimeout(() => speakSyllable(syllable, word), 300);
        }
    }

    function highlightSyllableInWord(syllable, word) {
        const index = word.indexOf(syllable);
        if (index !== -1) {
            const before = word.substring(0, index);
            const after = word.substring(index + syllable.length);
            $('#word-highlight').html(`
                <span class="word-part">${before}</span>
                <span class="word-part highlighted">${syllable}</span>
                <span class="word-part">${after}</span>
            `);
        } else {
            $('#word-highlight').text(word);
        }
    }

    // ========== РЕЖИМ ТЕСТИРОВАНИЯ ==========

    function setupTestingMode() {
        $('#learningMode').hide();
        $('#testingMode').show();
        $('#nextSyllableBtn').hide();
        $('#optionsContainer').show();
        $('#repeatQuestionBtn').show();
        $('#speakSyllableBtn').hide();

        // Сбрасываем флаги
        isWaitingForCharacter = false;
        isWaitingForVoice = false;
        if (characterTimeout) {
            clearTimeout(characterTimeout);
            characterTimeout = null;
        }

        generateQuestion();
    }

    function generateQuestion() {
        const state = SyllableGameState.get();
        const level = SyllableLevels.find(l => l.id === state.currentLevel);

        if (!level) return;

        // Выбираем случайный слог из изученных
        const availableSyllables = [...level.syllables];
        const randomIndex = Math.floor(Math.random() * availableSyllables.length);
        currentQuestionSyllable = availableSyllables[randomIndex];
        currentQuestionWord = level.words[randomIndex];

        // Генерируем варианты ответов (правильный + 3 других)
        const otherSyllables = availableSyllables.filter(s => s !== currentQuestionSyllable);

        // Перемешиваем другие слоги и берем первые 3 (или меньше, если их мало)
        const shuffledOthers = shuffleArray([...otherSyllables]);
        const otherOptions = shuffledOthers.slice(0, Math.min(3, shuffledOthers.length));

        // Составляем полный список опций
        currentOptions = [currentQuestionSyllable, ...otherOptions];

        // Если опций меньше 4, добавляем случайные слоги из других уровней
        while (currentOptions.length < 4) {
            const randomSyllable = getRandomSyllableFromAnyLevel();
            if (!currentOptions.includes(randomSyllable)) {
                currentOptions.push(randomSyllable);
            }
        }

        // Перемешиваем опции
        currentOptions = shuffleArray(currentOptions);

        // Отображаем варианты
        for (let i = 0; i < 4; i++) {
            $(`#option${i + 1}`).text(currentOptions[i] || '?');
        }

        // Показываем слово с пропуском
        displayWordWithBlank();

        // Озвучиваем вопрос
        if (SyllableGameState.getProp('autoVoice')) {
            setTimeout(() => speakCurrentQuestion(), 500);
        }

        // Сбрасываем выделения
        $('.option-btn').removeClass('correct-highlight wrong-highlight disabled');
    }

    function displayWordWithBlank() {
        if (!currentQuestionWord || !currentQuestionSyllable) return;

        const index = currentQuestionWord.indexOf(currentQuestionSyllable);
        if (index !== -1) {
            const before = currentQuestionWord.substring(0, index);
            const after = currentQuestionWord.substring(index + currentQuestionSyllable.length);
            $('#word-with-blank').html(`
                <span class="word-part">${before}</span>
                <span class="word-part blank">___</span>
                <span class="word-part">${after}</span>
            `);
        } else {
            $('#word-with-blank').text(currentQuestionWord);
        }
    }

    function getRandomSyllableFromAnyLevel() {
        const allSyllables = [];
        SyllableLevels.forEach(level => {
            allSyllables.push(...level.syllables);
        });

        // Убираем повторения
        const uniqueSyllables = [...new Set(allSyllables)];

        // Исключаем текущий правильный слог
        const availableSyllables = uniqueSyllables.filter(s => s !== currentQuestionSyllable);

        if (availableSyllables.length > 0) {
            return availableSyllables[Math.floor(Math.random() * availableSyllables.length)];
        }

        // Запасной вариант
        return 'ба';
    }

    // ========== ОЗВУЧКА ==========

    function speakCurrentQuestion() {
        if (!currentQuestionSyllable || !currentQuestionWord) return;

        SyllableVoiceService.speakQuestion(currentQuestionSyllable, currentQuestionWord);
    }

    function speakSyllable(syllable, word) {
        SyllableVoiceService.speakLearning(syllable, word);
    }

    // ========== НАВИГАЦИЯ ПО СЛОГАМ ==========

    function nextSyllable() {
        if (isWaitingForCharacter) return;

        const state = SyllableGameState.get();
        const level = SyllableLevels.find(l => l.id === state.currentLevel);

        if (!level) return;

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

    // ========== ОБРАБОТКА ОТВЕТОВ ==========

    function selectOption(selectedSyllable) {
        const state = SyllableGameState.get();

        if (state.currentMode !== 'testing') return;
        if (isWaitingForCharacter || isWaitingForVoice) return;

        const isCorrect = (selectedSyllable === currentQuestionSyllable);

        // Блокируем кнопки
        $('.option-btn').addClass('disabled');
        isWaitingForCharacter = true;

        if (isCorrect) {
            handleCorrectAnswer(selectedSyllable);
        } else {
            handleWrongAnswer(selectedSyllable);
        }

        updateUI();
    }

    function handleCorrectAnswer(selectedSyllable) {
        // Подсвечиваем правильный ответ
        $(`.option-btn:contains('${selectedSyllable}')`).addClass('correct-highlight');

        // Обновляем состояние
        SyllableGameState.handleCorrectAnswer();

        // Показываем правильный ответ в слове
        revealCorrectAnswer();

        // Озвучиваем поздравление
        if (SyllableGameState.getProp('voiceEnabled')) {
            SyllableVoiceService.speakCorrectAnswer(selectedSyllable, currentQuestionWord);
        }

        // Показываем конфетти
        showMiniConfetti();

        // Проверяем, достаточно ли правильных ответов для завершения уровня
        if (SyllableGameState.shouldCompleteLevel()) {
            // Завершаем уровень
            setTimeout(() => {
                UIManager.showMessage('Уровень пройден! ⭐ +1', '#ffd700');
                SyllableGameState.completeLevel();

                // Показываем персонажа
                CharacterManager.showCharacter('level_complete', () => {
                    loadLevel();
                    isWaitingForCharacter = false;
                });
            }, 800);
        } else {
            // Показываем персонажа за правильный ответ
            const shouldShowCharacter = (SyllableGameState.getProp('correctAnswers') % 3 === 0);

            if (shouldShowCharacter) {
                CharacterManager.showCharacter('correct', () => {
                    moveToNextQuestion();
                });
            } else {
                // Таймаут перед следующим вопросом
                characterTimeout = setTimeout(() => {
                    moveToNextQuestion();
                }, 1500);
            }
        }
    }

    function handleWrongAnswer(selectedSyllable) {
        // Подсвечиваем неправильный ответ
        $(`.option-btn:contains('${selectedSyllable}')`).addClass('wrong-highlight');

        // Подсвечиваем правильный ответ
        $(`.option-btn:contains('${currentQuestionSyllable}')`).addClass('correct-highlight');

        // Обновляем состояние
        SyllableGameState.handleWrongAnswer();

        // Озвучиваем ошибку
        if (SyllableGameState.getProp('voiceEnabled')) {
            SyllableVoiceService.speakWrongAnswer(currentQuestionSyllable);
        }

        // Проверяем, не пора ли вернуться к обучению
        if (SyllableGameState.shouldReturnToLearning()) {
            UIManager.showMessage('Давай ещё раз поучим слоги 📖', '#ff9800');

            setTimeout(() => {
                SyllableGameState.enterLearningMode();
                loadLevel();
                isWaitingForCharacter = false;
            }, 2000);
        } else {
            // Таймаут перед следующим вопросом
            characterTimeout = setTimeout(() => {
                moveToNextQuestion();
            }, 2000);
        }
    }

    function moveToNextQuestion() {
        isWaitingForCharacter = false;
        isWaitingForVoice = false;
        if (characterTimeout) {
            clearTimeout(characterTimeout);
            characterTimeout = null;
        }
        generateQuestion();
    }

    function revealCorrectAnswer() {
        if (!currentQuestionWord || !currentQuestionSyllable) return;

        $('#word-with-blank').html(`
            <span class="word-part correct-word">${currentQuestionWord}</span>
        `);
    }

    function showMiniConfetti() {
        confetti({
            particleCount: 30,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#4caf50', '#2196f3', '#ffd700']
        });
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function updateStats() {
        const state = SyllableGameState.get();
        $('#score-display').text(state.score);
        $('#stars-display').text(state.stars);
        $('#crowns-display').text(state.crowns);
    }

    function updateUI() {
        const state = SyllableGameState.get();

        // Обновляем статистику
        updateStats();

        // Обновляем прогресс в тестировании
        if (state.currentMode === 'testing') {
            $('#questions-progress').text(`${state.correctAnswers}/${state.questionsToPass}`);
            $('#wrong-counter').text(state.consecutiveWrongAnswers);

            // Изменяем цвет счетчика ошибок
            if (state.consecutiveWrongAnswers >= 3) {
                $('#wrong-counter').css('color', '#ff9800');
            } else if (state.consecutiveWrongAnswers >= 4) {
                $('#wrong-counter').css('color', '#f44336');
            } else {
                $('#wrong-counter').css('color', '#666');
            }
        }

        // Обновляем кнопки озвучки
        updateVoiceUI();
    }

    function updateVoiceUI() {
        const state = SyllableGameState.get();

        if (state.voiceEnabled) {
            $('#voiceToggleBtn').removeClass('disabled');
        } else {
            $('#voiceToggleBtn').addClass('disabled');
        }

        if (state.autoVoice) {
            $('#autoVoiceToggleBtn').addClass('active');
        } else {
            $('#autoVoiceToggleBtn').removeClass('active');
        }
    }

    // ========== ПУБЛИЧНЫЙ API ==========

    return {
        init,
        loadLevel,
        nextSyllable,
        selectOption,

        speakCurrentQuestion: () => {
            if (SyllableGameState.getProp('currentMode') === 'testing') {
                speakCurrentQuestion();
            }
        },

        speakCurrentSyllable: () => {
            if (SyllableGameState.getProp('currentMode') === 'learning') {
                const state = SyllableGameState.get();
                const level = SyllableLevels.find(l => l.id === state.currentLevel);
                if (level) {
                    const syllable = level.syllables[state.currentSyllableIndex];
                    const word = level.words[state.currentSyllableIndex];
                    speakSyllable(syllable, word);
                }
            }
        },

        // Для отладки
        _getCurrentQuestion: () => ({
            syllable: currentQuestionSyllable,
            word: currentQuestionWord,
            options: [...currentOptions]
        }),

        _reset: () => {
            currentQuestionSyllable = null;
            currentQuestionWord = null;
            currentOptions = [];
            isWaitingForCharacter = false;
            isWaitingForVoice = false;
            if (characterTimeout) {
                clearTimeout(characterTimeout);
                characterTimeout = null;
            }
        }
    };
})();

window.SyllableGameLogic = SyllableGameLogic;