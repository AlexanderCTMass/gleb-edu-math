// ========== СОСТОЯНИЕ ИГРЫ ==========
const GameState = (function() {
    // Ключ для localStorage
    const STORAGE_KEY = 'mathGameState';

    // Константы
    const DEFAULT_MIN_INTERVAL_BETWEEN_CHARACTERS = 8000;

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
        minIntervalBetweenCharacters: DEFAULT_MIN_INTERVAL_BETWEEN_CHARACTERS,
        dragActive: false,
        // Настройки озвучки
        voiceEnabled: true,
        autoVoice: true
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

                // Синхронизируем с VoiceCore
                if (typeof VoiceCore !== 'undefined') {
                    VoiceCore.syncWithGameState(state.voiceEnabled);
                }
            }
        } catch (e) {
            console.error('Failed to load game state:', e);
        }
    }

    // Сохранение состояния в localStorage
    function saveToStorage() {
        try {
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
                lastCharacterTime: state.lastCharacterTime,
                voiceEnabled: state.voiceEnabled,
                autoVoice: state.autoVoice
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
        listeners.forEach(callback => {
            try {
                callback(state);
            } catch (e) {
                console.error('Error in state listener:', e);
            }
        });
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

            // Синхронизируем с VoiceCore при изменении voiceEnabled
            if (prop === 'voiceEnabled' && typeof VoiceCore !== 'undefined') {
                VoiceCore.syncWithGameState(value);
                // Отправляем событие для синхронизации с VoiceCore
                window.dispatchEvent(new CustomEvent('voiceStateChanged', {
                    detail: { enabled: value }
                }));
            }

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

            // Очищаем кэш аудио в VoiceCore
            if (typeof VoiceCore !== 'undefined') {
                VoiceCore.clearCache();
                VoiceCore._resetQueue();
            }

            // Очищаем ресурсы ResourceManager
            if (typeof ResourceManager !== 'undefined') {
                ResourceManager.clearGameResources();
            }

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
                minIntervalBetweenCharacters: DEFAULT_MIN_INTERVAL_BETWEEN_CHARACTERS,
                dragActive: false,
                voiceEnabled: true,
                autoVoice: true
            };

            // Очищаем localStorage
            localStorage.removeItem(STORAGE_KEY);

            // Синхронизируем VoiceCore
            if (typeof VoiceCore !== 'undefined') {
                VoiceCore.syncWithGameState(true);
            }

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

        // Методы для управления озвучкой
        toggleVoice: function() {
            state.voiceEnabled = !state.voiceEnabled;

            // Синхронизируем с VoiceCore
            if (typeof VoiceCore !== 'undefined') {
                VoiceCore.syncWithGameState(state.voiceEnabled);
                window.dispatchEvent(new CustomEvent('voiceStateChanged', {
                    detail: { enabled: state.voiceEnabled }
                }));
            }

            notifyListeners();
            return state.voiceEnabled;
        },

        toggleAutoVoice: function() {
            state.autoVoice = !state.autoVoice;
            notifyListeners();
            return state.autoVoice;
        },

        // Полная очистка сохранения
        clearStorage: function() {
            localStorage.removeItem(STORAGE_KEY);
            if (typeof VoiceCore !== 'undefined') {
                VoiceCore.clearCache();
                VoiceCore._resetQueue();
            }
            if (typeof ResourceManager !== 'undefined') {
                ResourceManager.clearAll();
            }
            console.log('Storage cleared');
        }
    };
})();