// ========== СОСТОЯНИЕ ИГРЫ ==========
const GameState = (function() {
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

    function notifyListeners() {
        listeners.forEach(callback => callback(state));
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
        }
    };
})();