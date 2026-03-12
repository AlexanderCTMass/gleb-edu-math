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

    // Кэш для отслеживания загружаемых файлов
    const loadingCache = new Set();

    function loadImages(charactersList) {
        charactersList.forEach(char => {
            // Проверяем, не загружается ли уже это изображение
            const cacheKey = `img_${char.fileName}`;
            if (loadingCache.has(cacheKey)) return;
            loadingCache.add(cacheKey);

            const img = new Image();
            img.src = `../assets/images/${char.fileName}`;

            img.onload = () => {
                resources.images[char.id] = img;
                loadingCache.delete(cacheKey);
                resourceLoaded();
            };

            img.onerror = () => {
                console.warn(`Не удалось загрузить изображение для ${char.id}`);
                // Создаем заглушку с правильным форматом
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 100;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(50, 50, 45, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = '50px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('👤', 50, 60);

                // Конвертируем canvas в Image
                const fallbackImg = new Image();
                fallbackImg.src = canvas.toDataURL();
                resources.images[char.id] = fallbackImg;
                loadingCache.delete(cacheKey);
                resourceLoaded();
            };
        });
    }

    function loadAudio(phrasesList) {
        // Группируем фразы по файлам, чтобы не загружать один файл multiple раз
        const fileMap = new Map();
        phrasesList.forEach(phrase => {
            if (!fileMap.has(phrase.fileName)) {
                fileMap.set(phrase.fileName, []);
            }
            fileMap.get(phrase.fileName).push(phrase);
        });

        fileMap.forEach((phrases, fileName) => {
            const cacheKey = `audio_${fileName}`;
            if (loadingCache.has(cacheKey)) return;
            loadingCache.add(cacheKey);

            const audio = new Audio();
            audio.src = `../assets/audio/phrases/${fileName}`;
            audio.preload = 'auto';

            // Обработчик успешной загрузки
            const handleLoad = () => {
                // Присваиваем одно и то же аудио всем фразам с этим файлом
                phrases.forEach(phrase => {
                    // Создаем клон для каждой фразы, чтобы можно было играть параллельно
                    const audioClone = audio.cloneNode(true);
                    resources.audio[phrase.id] = audioClone;
                });

                loadingCache.delete(cacheKey);
                // Увеличиваем счетчик на количество фраз
                for (let i = 0; i < phrases.length; i++) {
                    resourceLoaded();
                }
            };

            audio.addEventListener('canplaythrough', handleLoad, { once: true });

            audio.addEventListener('error', () => {
                console.warn(`Не удалось загрузить аудио для ${fileName}`);

                // Создаем заглушку для каждой фразы
                phrases.forEach(phrase => {
                    const silentAudio = new Audio();
                    // Создаем пустой аудиофайл
                    silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMA==';
                    resources.audio[phrase.id] = silentAudio;
                });

                loadingCache.delete(cacheKey);
                // Увеличиваем счетчик на количество фраз
                for (let i = 0; i < phrases.length; i++) {
                    resourceLoaded();
                }
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
            loadingCache.clear();

            loadImages(characters);
            loadAudio(phrases);
        },

        getImage: function(characterId) {
            const img = resources.images[characterId];
            return img || null;
        },

        getAudio: function(phraseId) {
            const audio = resources.audio[phraseId];
            if (audio) {
                // Создаем новый экземпляр для каждого воспроизведения
                const audioClone = audio.cloneNode(true);
                audioClone.currentTime = 0;
                return audioClone;
            }
            return null;
        },

        // Очистка ресурсов для конкретной игры
        clearGameResources: function() {
            // Очищаем только аудио, так как изображения могут быть общими
            resources.audio = {};
        },

        // Полная очистка
        clearAll: function() {
            resources.images = {};
            resources.audio = {};
            loadingCache.clear();
        }
    };
})();