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
        console.log('SyllableGameLogic initialized');
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

        const state = SyllableGameState.get();
        const level = SyllableLevels.find(l => l.id === state.currentLevel);

        if (!level) return;

        const syllable = level.syllables[state.currentSyllableIndex];
        const word = level.words[state.currentSyllableIndex];

        $('#current-syllable').text(syllable);
        $('#word-highlight').text(word || '');
        $('#syllable-count').text(`${state.currentSyllableIndex + 1}/${level.syllables.length}`);

        highlightSyllableInWord(syllable, word || '');

        if (SyllableGameState.getProp('autoVoice') && typeof SyllableVoiceService !== 'undefined') {
            setTimeout(() => speakSyllable(syllable, word || ''), 300);
        }
    }

    function highlightSyllableInWord(syllable, word) {
        if (!word) {
            $('#word-highlight').html(word);
            return;
        }

        const index = word.toUpperCase().indexOf(syllable.toUpperCase());
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

        if (!level || !level.syllables || level.syllables.length === 0) return;

        const randomIndex = Math.floor(Math.random() * level.syllables.length);
        currentQuestionSyllable = level.syllables[randomIndex];
        currentQuestionWord = level.words ? level.words[randomIndex] : '';

        const otherSyllables = level.syllables.filter(s => s !== currentQuestionSyllable);
        const shuffledOthers = shuffleArray([...otherSyllables]);
        const otherOptions = shuffledOthers.slice(0, 3);

        currentOptions = [currentQuestionSyllable, ...otherOptions];

        while (currentOptions.length < 4) {
            currentOptions.push(getRandomSyllableFromAnyLevel());
        }

        currentOptions = shuffleArray(currentOptions).slice(0, 4);

        for (let i = 0; i < 4; i++) {
            $(`#option${i + 1}`).text(currentOptions[i] || '?');
        }

        displayWordWithBlank();

        if (SyllableGameState.getProp('autoVoice') && typeof SyllableVoiceService !== 'undefined') {
            setTimeout(() => speakCurrentQuestion(), 500);
        }

        $('.option-btn').removeClass('correct-highlight wrong-highlight disabled');
    }

    function displayWordWithBlank() {
        if (!currentQuestionWord || !currentQuestionSyllable) return;

        const index = currentQuestionWord.toUpperCase().indexOf(currentQuestionSyllable.toUpperCase());
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
            if (level.syllables) {
                allSyllables.push(...level.syllables);
            }
        });

        const uniqueSyllables = [...new Set(allSyllables)];
        const availableSyllables = uniqueSyllables.filter(s => s !== currentQuestionSyllable);

        if (availableSyllables.length > 0) {
            return availableSyllables[Math.floor(Math.random() * availableSyllables.length)];
        }

        return 'МА';
    }

    // ========== ОЗВУЧКА ==========

    function speakCurrentQuestion() {
        if (!currentQuestionSyllable || !currentQuestionWord) return;
        if (typeof SyllableVoiceService === 'undefined') return;

        SyllableVoiceService.speakQuestion(currentQuestionSyllable, currentQuestionWord);
    }

    function speakSyllable(syllable, word) {
        if (typeof SyllableVoiceService === 'undefined') return;
        SyllableVoiceService.speakLearning(syllable, word);
    }

    // ========== НАВИГАЦИЯ ПО СЛОГАМ ==========

    function nextSyllable() {
        if (isWaitingForCharacter) return;

        const state = SyllableGameState.get();
        const level = SyllableLevels.find(l => l.id === state.currentLevel);

        if (!level) return;

        const currentSyllable = level.syllables[state.currentSyllableIndex];
        SyllableGameState.markSyllableAsMastered(currentSyllable);

        const hasNext = SyllableGameState.nextSyllable();

        if (!hasNext) {
            if (typeof UIManager !== 'undefined') {
                UIManager.showMessage('Отлично! А теперь проверка! ⭐', '#4caf50');
            }
            SyllableGameState.enterTestingMode();
        }

        loadLevel();
    }

    // ========== ОБРАБОТКА ОТВЕТОВ ==========

    function selectOption(selectedSyllable) {
        const state = SyllableGameState.get();

        if (state.currentMode !== 'testing') return;
        if (isWaitingForCharacter || isWaitingForVoice) return;

        const isCorrect = (selectedSyllable === currentQuestionSyllable);

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
        $(`.option-btn:contains('${selectedSyllable}')`).addClass('correct-highlight');

        SyllableGameState.handleCorrectAnswer();

        revealCorrectAnswer();

        if (SyllableGameState.getProp('voiceEnabled') && typeof SyllableVoiceService !== 'undefined') {
            SyllableVoiceService.speakCorrectAnswer(selectedSyllable, currentQuestionWord);
        }

        showMiniConfetti();

        if (SyllableGameState.shouldCompleteLevel()) {
            setTimeout(() => {
                if (typeof UIManager !== 'undefined') {
                    UIManager.showMessage('Уровень пройден! ⭐ +1', '#ffd700');
                }
                SyllableGameState.completeLevel();

                if (typeof SyllableCharacterManager !== 'undefined') {
                    SyllableCharacterManager.showCharacter('correct', () => {
                        loadLevel();
                        isWaitingForCharacter = false;
                    });
                } else {
                    loadLevel();
                    isWaitingForCharacter = false;
                }
            }, 800);
        } else {
            const shouldShowCharacter = (SyllableGameState.getProp('correctAnswers') % 3 === 0);

            if (shouldShowCharacter && typeof SyllableCharacterManager !== 'undefined') {
                SyllableCharacterManager.showCharacter('correct', () => {
                    moveToNextQuestion();
                });
            } else {
                characterTimeout = setTimeout(() => {
                    moveToNextQuestion();
                }, 1500);
            }
        }
    }

    function handleWrongAnswer(selectedSyllable) {
        $(`.option-btn:contains('${selectedSyllable}')`).addClass('wrong-highlight');
        $(`.option-btn:contains('${currentQuestionSyllable}')`).addClass('correct-highlight');

        SyllableGameState.handleWrongAnswer();

        if (SyllableGameState.getProp('voiceEnabled') && typeof SyllableVoiceService !== 'undefined') {
            SyllableVoiceService.speakWrongAnswer(currentQuestionSyllable);
        }

        if (SyllableGameState.shouldReturnToLearning()) {
            if (typeof UIManager !== 'undefined') {
                UIManager.showMessage('Давай ещё раз поучим слоги 📖', '#ff9800');
            }

            setTimeout(() => {
                SyllableGameState.enterLearningMode();
                loadLevel();
                isWaitingForCharacter = false;
            }, 2000);
        } else {
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
        if (typeof confetti === 'undefined') return;

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

        updateStats();

        if (state.currentMode === 'testing') {
            $('#questions-progress').text(`${state.correctAnswers}/${state.questionsToPass}`);
            $('#wrong-counter').text(state.consecutiveWrongAnswers);

            if (state.consecutiveWrongAnswers >= 3) {
                $('#wrong-counter').css('color', '#ff9800');
            } else if (state.consecutiveWrongAnswers >= 4) {
                $('#wrong-counter').css('color', '#f44336');
            } else {
                $('#wrong-counter').css('color', '#666');
            }
        }

        updateVoiceUI();
    }

    function updateVoiceUI() {
        const state = SyllableGameState.get();

        if (state.voiceEnabled) {
            $('#voiceToggleBtn').removeClass('disabled');
            $('#voiceIcon').text('🔊');
        } else {
            $('#voiceToggleBtn').addClass('disabled');
            $('#voiceIcon').text('🔇');
        }

        if (state.autoVoice) {
            $('#autoVoiceToggleBtn').addClass('active');
            $('#autoVoiceIcon').text('🎤');
        } else {
            $('#autoVoiceToggleBtn').removeClass('active');
            $('#autoVoiceIcon').text('🎤');
        }
    }

    // ========== ПУБЛИЧНЫЙ API ==========

    return {
        init,
        loadLevel,
        nextSyllable,
        selectOption,

        speakCurrentQuestion: function() {
            if (SyllableGameState.getProp('currentMode') === 'testing') {
                speakCurrentQuestion();
            }
        },

        speakCurrentSyllable: function() {
            if (SyllableGameState.getProp('currentMode') === 'learning') {
                const state = SyllableGameState.get();
                const level = SyllableLevels.find(l => l.id === state.currentLevel);
                if (level) {
                    const syllable = level.syllables[state.currentSyllableIndex];
                    const word = level.words ? level.words[state.currentSyllableIndex] : '';
                    speakSyllable(syllable, word);
                }
            }
        },

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