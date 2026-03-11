// ========== СОСТОЯНИЕ ИГРЫ ДЛЯ СЛОГОВ ==========
const SyllableGameState = (function() {
    const STORAGE_KEY = 'syllableGameState';

    let state = {
        currentLevel: 1,           // текущий уровень (1-8)
        currentMode: 'learning',    // 'learning' или 'testing'
        currentSyllableIndex: 0,    // индекс текущего слога в обучении
        masteredSyllables: [],      // выученные слоги (id слогов)

        // Для тестирования
        questionsAnswered: 0,       // всего отвечено вопросов
        correctAnswers: 0,          // правильных ответов в текущем тесте
        wrongAnswers: 0,            // неправильных ответов подряд
        totalWrongAnswers: 0,       // всего неправильных за тест

        // Для возврата к обучению
        consecutiveWrongAnswers: 0,  // неправильных подряд
        wrongAnswersThreshold: 5,    // порог для возврата к обучению
        questionsToPass: 10,         // вопросов для прохождения

        // Статистика
        score: 0,                    // очки
        stars: 0,                    // звезды (за уровни)
        crowns: 0,                   // короны (за числа)

        // Настройки озвучки
        voiceEnabled: true,
        autoVoice: true
    };

    const listeners = [];

    // Загрузка из localStorage
    function loadFromStorage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                state = { ...state, ...parsed };
                console.log('Syllable game state loaded:', state);
            }
        } catch (e) {
            console.error('Failed to load syllable game state:', e);
        }
    }

    function saveToStorage() {
        try {
            const stateToSave = {
                currentLevel: state.currentLevel,
                currentMode: state.currentMode,
                currentSyllableIndex: state.currentSyllableIndex,
                masteredSyllables: state.masteredSyllables,
                questionsAnswered: state.questionsAnswered,
                correctAnswers: state.correctAnswers,
                wrongAnswers: state.wrongAnswers,
                totalWrongAnswers: state.totalWrongAnswers,
                consecutiveWrongAnswers: state.consecutiveWrongAnswers,
                score: state.score,
                stars: state.stars,
                crowns: state.crowns,
                voiceEnabled: state.voiceEnabled,
                autoVoice: state.autoVoice
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error('Failed to save syllable game state:', e);
        }
    }

    loadFromStorage();

    function notifyListeners() {
        listeners.forEach(callback => callback(state));
        saveToStorage();
    }

    return {
        get: function() {
            return { ...state };
        },

        getProp: function(prop) {
            return state[prop];
        },

        set: function(newState) {
            state = { ...state, ...newState };
            notifyListeners();
        },

        update: function(prop, value) {
            state[prop] = value;
            notifyListeners();
        },

        subscribe: function(callback) {
            listeners.push(callback);
            callback(state);
        },

        // Специализированные методы для слоговой игры
        enterLearningMode: function() {
            state.currentMode = 'learning';
            state.currentSyllableIndex = 0;
            notifyListeners();
        },

        enterTestingMode: function() {
            state.currentMode = 'testing';
            state.correctAnswers = 0;
            state.wrongAnswers = 0;
            state.totalWrongAnswers = 0;
            state.consecutiveWrongAnswers = 0;
            notifyListeners();
        },

        nextSyllable: function() {
            const level = SyllableLevels.find(l => l.id === state.currentLevel);
            if (level && state.currentSyllableIndex < level.syllables.length - 1) {
                state.currentSyllableIndex++;
                notifyListeners();
                return true;
            }
            return false; // все слоги уровня изучены
        },

        markSyllableAsMastered: function(syllable) {
            const syllableId = `${state.currentLevel}_${syllable}`;
            if (!state.masteredSyllables.includes(syllableId)) {
                state.masteredSyllables.push(syllableId);
            }
        },

        handleCorrectAnswer: function() {
            state.correctAnswers++;
            state.questionsAnswered++;
            state.score++;
            state.consecutiveWrongAnswers = 0;
            notifyListeners();
        },

        handleWrongAnswer: function() {
            state.wrongAnswers++;
            state.totalWrongAnswers++;
            state.consecutiveWrongAnswers++;
            notifyListeners();
        },

        shouldReturnToLearning: function() {
            return state.consecutiveWrongAnswers >= state.wrongAnswersThreshold;
        },

        shouldCompleteLevel: function() {
            return state.correctAnswers >= state.questionsToPass;
        },

        completeLevel: function() {
            state.stars++;
            if (state.currentLevel < 8) {
                state.currentLevel++;
                state.currentMode = 'learning';
                state.currentSyllableIndex = 0;
                state.questionsAnswered = 0;
                state.correctAnswers = 0;
                state.wrongAnswers = 0;
                state.totalWrongAnswers = 0;
                state.consecutiveWrongAnswers = 0;
            } else {
                // Все уровни пройдены
                state.crowns++;
                UIManager.showMessage('Поздравляю! Ты выучил все слоги! 👑', '#ffd700');
            }
            notifyListeners();
        },

        resetGame: function() {
            state = {
                currentLevel: 1,
                currentMode: 'learning',
                currentSyllableIndex: 0,
                masteredSyllables: [],
                questionsAnswered: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                totalWrongAnswers: 0,
                consecutiveWrongAnswers: 0,
                wrongAnswersThreshold: 5,
                questionsToPass: 10,
                score: 0,
                stars: 0,
                crowns: 0,
                voiceEnabled: true,
                autoVoice: true
            };
            localStorage.removeItem(STORAGE_KEY);
            notifyListeners();
            return state;
        },

        toggleVoice: function() {
            state.voiceEnabled = !state.voiceEnabled;
            notifyListeners();
            return state.voiceEnabled;
        },

        toggleAutoVoice: function() {
            state.autoVoice = !state.autoVoice;
            notifyListeners();
            return state.autoVoice;
        }
    };
})();