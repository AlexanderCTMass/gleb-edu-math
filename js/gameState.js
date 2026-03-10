// ========== СОСТОЯНИЕ ИГРЫ ==========
const GameState = (function() {
    // Ключ для localStorage
    const STORAGE_KEY = 'mathGameState';

    let state = {
        currentNum: 2,
        currentLevel: 0,
        score: 0,
        stars: 0,
        crowns: 0,
        floors: [],
        selectedFloorIndex: 0,
        selectedSide: 'left',
        selectedDigit: null,
        unknownPos: 'right',
        wrongAttempts: 0,
        lastWrongFloor: null,
        lastWrongSide: null,
        lastCharacterTime: 0,
        minIntervalBetweenCharacters: 8000,
        dragActive: false
    };

    const listeners = [];

    // Загрузка состояния из localStorage
    function loadFromStorage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                state = { ...state, ...parsed };
                console.log('Game state loaded from storage:', state);
            }
        } catch (e) {
            console.error('Failed to load game state:', e);
        }
    }

    // Сохранение состояния в localStorage
    function saveToStorage() {
        try {
            // Сохраняем только нужные поля (исключаем функции и временные данные)
            const stateToSave = {
                currentNum: state.currentNum,
                currentLevel: state.currentLevel,
                score: state.score,
                stars: state.stars,
                crowns: state.crowns,
                floors: state.floors,
                selectedFloorIndex: state.selectedFloorIndex,
                wrongAttempts: state.wrongAttempts,
                lastWrongFloor: state.lastWrongFloor,
                lastWrongSide: state.lastWrongSide,
                lastCharacterTime: state.lastCharacterTime
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
            console.log('Game state saved to storage');
        } catch (e) {
            console.error('Failed to save game state:', e);
        }
    }

    // Загружаем сохраненное состояние при инициализации
    loadFromStorage();

    function notifyListeners() {
        listeners.forEach(callback => callback(state));
        saveToStorage(); // Сохраняем при каждом изменении
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

        reset: function() {
            state = {
                ...state,
                selectedFloorIndex: 0,
                selectedSide: 'left',
                selectedDigit: null,
                wrongAttempts: 0,
                lastWrongFloor: null,
                lastWrongSide: null
            };
            notifyListeners();
        },

        // Сброс всей игры (начать сначала)
        resetGame: function() {
            console.log('Resetting game completely');
            state = {
                currentNum: 2,
                currentLevel: 0,
                score: 0,
                stars: 0,
                crowns: 0,
                floors: [],
                selectedFloorIndex: 0,
                selectedSide: 'left',
                selectedDigit: null,
                unknownPos: 'right',
                wrongAttempts: 0,
                lastWrongFloor: null,
                lastWrongSide: null,
                lastCharacterTime: 0,
                minIntervalBetweenCharacters: 8000,
                dragActive: false
            };
            // Очищаем localStorage
            localStorage.removeItem(STORAGE_KEY);
            notifyListeners();
            return state;
        },

        // Специализированные методы
        incrementScore: function() {
            state.score++;
            notifyListeners();
        },

        incrementStars: function() {
            state.stars++;
            notifyListeners();
        },

        incrementCrowns: function() {
            state.crowns++;
            notifyListeners();
        },

        nextLevel: function() {
            if (state.currentLevel < 8) {
                state.currentLevel++;
                notifyListeners();
            }
        },

        nextNumber: function() {
            if (state.currentNum < 10) {
                state.currentNum++;
                state.currentLevel = 0;
                notifyListeners();
            }
        },

        // Полная очистка сохранения
        clearStorage: function() {
            localStorage.removeItem(STORAGE_KEY);
            console.log('Storage cleared');
        }
    };
})();