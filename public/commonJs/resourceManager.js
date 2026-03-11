// ========== МЕНЕДЖЕР ЗАГРУЗКИ РЕСУРСОВ ==========
const ResourceManager = (function() {
    const resources = {
        images: {},
        audio: {}
    };

    let totalResources = 0;
    let loadedResources = 0;
    let onProgressCallback = null;
    let onCompleteCallback = null;

    function loadImages(charactersList) {
        charactersList.forEach(char => {
            const img = new Image();
            img.src = `../assets/images/${char.fileName}`;
            img.onload = () => {
                resources.images[char.id] = img;
                resourceLoaded();
            };
            img.onerror = () => {
                console.warn(`Не удалось загрузить изображение для ${char.id}`);
                // Создаем заглушку
                const fallbackImg = new Image();
                fallbackImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23ffd700"/><text x="50" y="70" font-size="50" text-anchor="middle" fill="white">👤</text></svg>';
                resources.images[char.id] = fallbackImg;
                resourceLoaded();
            };
        });
    }

    function loadAudio(phrasesList) {
        phrasesList.forEach(phrase => {
            const audio = new Audio();
            audio.src = `assets/audio/phrases/${phrase.fileName}`;
            audio.preload = 'auto';

            audio.addEventListener('canplaythrough', () => {
                if (!resources.audio[phrase.id]) {
                    resources.audio[phrase.id] = audio;
                    resourceLoaded();
                }
            }, { once: true });

            audio.addEventListener('error', () => {
                console.warn(`Не удалось загрузить аудио для ${phrase.id}`);
                const fallbackAudio = new Audio();
                resources.audio[phrase.id] = fallbackAudio;
                resourceLoaded();
            });

            audio.load();
        });
    }

    function resourceLoaded() {
        loadedResources++;
        if (onProgressCallback) {
            onProgressCallback(loadedResources, totalResources);
        }
        if (loadedResources === totalResources && onCompleteCallback) {
            onCompleteCallback();
        }
    }

    return {
        init: function(characters, phrases, onProgress, onComplete) {
            totalResources = characters.length + phrases.length;
            loadedResources = 0;
            onProgressCallback = onProgress;
            onCompleteCallback = onComplete;

            loadImages(characters);
            loadAudio(phrases);
        },

        getImage: function(characterId) {
            return resources.images[characterId] || null;
        },

        getAudio: function(phraseId) {
            const audio = resources.audio[phraseId];
            if (audio) {
                audio.currentTime = 0;
            }
            return audio;
        }
    };
})();