$(document).ready(function() {
    // ========== ДАННЫЕ ==========
    const characters = [
        { id: 'child', name: 'Ты', fileName: 'child.png' },
        { id: 'father', name: 'Папа', fileName: 'father.png' },
        { id: 'mother', name: 'Мама', fileName: 'mother.png' },
        { id: 'grandfather1', name: 'Дедушка 1', fileName: 'grandfather1.png' },
        { id: 'grandmother1', name: 'Бабушка 1', fileName: 'grandmother1.png' },
        { id: 'grandfather2', name: 'Дедушка 2', fileName: 'grandfather2.png' },
        { id: 'grandmother2', name: 'Бабушка 2', fileName: 'grandmother2.png' },
        { id: 'sister', name: 'Сестренка', fileName: 'sister.png' },
        { id: 'cat_marsel', name: 'Кот Марсель', fileName: 'cat_marsel.png' },
        { id: 'cat_volt', name: 'Кот Вольт', fileName: 'cat_volt.png' },
        { id: 'dog_becky', name: 'Собака Бэкки', fileName: 'dog_becky.png' }
    ];

    const phrases = [
        { id: 'child_well_done', characterId: 'child', type: 'correct', fileName: 'child_well_done.mp3' },
        { id: 'father_great', characterId: 'father', type: 'correct', fileName: 'father_great.mp3' },
        { id: 'mother_super', characterId: 'mother', type: 'correct', fileName: 'mother_super.mp3' },
        { id: 'grandfather1_molodets', characterId: 'grandfather1', type: 'correct', fileName: 'grandfather1_molodets.mp3' },
        { id: 'grandmother1_umnitsa', characterId: 'grandmother1', type: 'correct', fileName: 'grandmother1_umnitsa.mp3' },
        { id: 'cat_marsel_mur', characterId: 'cat_marsel', type: 'correct', fileName: 'cat_marsel_mur.mp3' },
        { id: 'cat_volt_myau', characterId: 'cat_volt', type: 'correct', fileName: 'cat_volt_myau.mp3' },
        { id: 'dog_becky_gav', characterId: 'dog_becky', type: 'correct', fileName: 'dog_becky_gav.mp3' },
        { id: 'mother_try_again', characterId: 'mother', type: 'incorrect', fileName: 'mother_try_again.mp3' },
        { id: 'father_no_problem', characterId: 'father', type: 'incorrect', fileName: 'father_no_problem.mp3' },
        { id: 'grandmother1_next', characterId: 'grandmother1', type: 'incorrect', fileName: 'grandmother1_next.mp3' },
        { id: 'sister_help', characterId: 'sister', type: 'incorrect', fileName: 'sister_help.mp3' },
        { id: 'grandfather1_pride', characterId: 'grandfather1', type: 'random', fileName: 'grandfather1_pride.mp3' },
        { id: 'grandmother2_love', characterId: 'grandmother2', type: 'random', fileName: 'grandmother2_love.mp3' },
        { id: 'sister_cool', characterId: 'sister', type: 'random', fileName: 'sister_cool.mp3' }
    ];

    // ========== МЕНЕДЖЕР РЕСУРСОВ ==========
    const ResourceManager = {
        images: {},
        audio: {},
        totalResources: 0,
        loadedResources: 0,

        loadImages: function(charactersList, onProgress, onComplete) {
            charactersList.forEach(char => {
                const img = new Image();
                img.src = `assets/images/characters/${char.fileName}`;
                img.onload = () => {
                    this.images[char.id] = img;
                    this.loadedResources++;
                    onProgress?.(this.loadedResources, this.totalResources);
                    if (this.loadedResources === this.totalResources) {
                        onComplete?.();
                    }
                };
                img.onerror = () => {
                    console.warn(`Не удалось загрузить изображение для ${char.id}`);
                    const fallbackImg = new Image();
                    fallbackImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23ffd700"/><text x="50" y="70" font-size="50" text-anchor="middle" fill="white">👤</text></svg>';
                    this.images[char.id] = fallbackImg;
                    this.loadedResources++;
                    onProgress?.(this.loadedResources, this.totalResources);
                    if (this.loadedResources === this.totalResources) {
                        onComplete?.();
                    }
                };
            });
        },

        loadAudio: function(phrasesList, onProgress, onComplete) {
            phrasesList.forEach(phrase => {
                const audio = new Audio();
                audio.src = `assets/audio/phrases/${phrase.fileName}`;
                audio.preload = 'auto';

                audio.addEventListener('canplaythrough', () => {
                    if (!this.audio[phrase.id]) {
                        this.audio[phrase.id] = audio;
                        this.loadedResources++;
                        onProgress?.(this.loadedResources, this.totalResources);
                        if (this.loadedResources === this.totalResources) {
                            onComplete?.();
                        }
                    }
                }, { once: true });

                audio.addEventListener('error', () => {
                    console.warn(`Не удалось загрузить аудио для ${phrase.id}`);
                    const fallbackAudio = new Audio();
                    this.audio[phrase.id] = fallbackAudio;
                    this.loadedResources++;
                    onProgress?.(this.loadedResources, this.totalResources);
                    if (this.loadedResources === this.totalResources) {
                        onComplete?.();
                    }
                });

                audio.load();
            });
        },

        init: function(characters, phrases, onProgress, onComplete) {
            this.totalResources = characters.length + phrases.length;
            this.loadedResources = 0;
            this.loadImages(characters, onProgress, onComplete);
            this.loadAudio(phrases, onProgress, onComplete);
        },

        getImage: function(characterId) {
            return this.images[characterId] || null;
        },

        getAudio: function(phraseId) {
            const audio = this.audio[phraseId];
            if (audio) {
                audio.currentTime = 0;
            }
            return audio;
        }
    };

    // ========== СОСТОЯНИЕ ИГРЫ ==========
    const gameState = {
        currentNum: 2,
        currentLevel: 0,
        score: 0,
        stars: 0,
        crowns: 0,
        floors: [],
        selectedFloorIndex: 0,
        selectedSide: 'left',
        wrongAttempts: 0,
        lastWrongFloor: null,
        lastWrongSide: null,
        lastCharacterTime: 0,
        minIntervalBetweenCharacters: 8000,
        dragActive: false
    };

    // Предотвращаем скролл страницы при перетаскивании
    document.addEventListener('touchmove', function(e) {
        if (gameState.dragActive) {
            e.preventDefault();
        }
    }, { passive: false });

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
    function canShowCharacter() {
        const now = Date.now();
        if (now - gameState.lastCharacterTime > gameState.minIntervalBetweenCharacters) {
            gameState.lastCharacterTime = now;
            return true;
        }
        return false;
    }

    function showCharacter(reason = 'correct') {
        if (!canShowCharacter()) return;

        let availablePhrases = phrases.filter(p => p.type === reason);
        if (availablePhrases.length === 0) {
            availablePhrases = phrases.filter(p => p.type === 'random');
        }

        const randomPhrase = availablePhrases[Math.floor(Math.random() * availablePhrases.length)];
        const character = characters.find(c => c.id === randomPhrase.characterId);

        if (!character) return;

        const characterImg = ResourceManager.getImage(character.id);
        if (characterImg) {
            $('#characterImage').attr('src', characterImg.src);
        }

        const audio = ResourceManager.getAudio(randomPhrase.id);
        if (audio) {
            audio.play().catch(e => console.log('Аудио не воспроизвелось:', e));
        }

        const popup = $('#characterPopup');
        popup.removeClass('show from-right');

        if (Math.random() > 0.5) {
            popup.addClass('show from-right');
        } else {
            popup.addClass('show');
        }

        setTimeout(() => {
            popup.removeClass('show from-right');
            if (audio && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        }, 4000);
    }

    // ========== ГЕНЕРАЦИЯ ДОМИКА ==========
    function generateHouse(number) {
        const floors = [];
        for (let i = 1; i < number; i++) {
            floors.push({
                left: i,
                right: number - i,
                leftFilled: false,
                rightFilled: false,
                userLeft: null,
                userRight: null
            });
        }
        return floors;
    }

    // ========== ПРОВЕРКА РЕДАКТИРУЕМОСТИ ЯЧЕЙКИ ==========
    function isCellEditable(floorIndex, side) {
        const level = gameState.currentLevel;

        if (level === 0 && floorIndex === 0) return false;
        if (level === 1) return side === 'right';
        if (level === 2) return side === 'left';
        if (level === 5) return false; // Через табло ответ
        if (level === 6) return side === 'left';
        if (level === 7) return side === 'right';

        return true;
    }

    // ========== ОТРИСОВКА ДОМИКА ==========
    function renderHouse() {
        const container = $('#floors-container');
        container.empty();

        gameState.floors.forEach((floor, index) => {
            const row = $('<div>').addClass('floor-row');
            if (index === gameState.selectedFloorIndex) {
                row.addClass('active-floor');
            }

            // Левая ячейка
            const leftCell = $('<div>').addClass('floor-cell');
            if (floor.userLeft !== null) {
                leftCell.text(floor.userLeft).addClass('filled');
            } else {
                leftCell.text('?').addClass('empty');
            }

            if (!isCellEditable(index, 'left')) {
                leftCell.addClass('locked');
            }

            leftCell.attr('data-floor', index);
            leftCell.attr('data-side', 'left');
            leftCell.attr('data-value', floor.userLeft !== null ? floor.userLeft : '');

            // Правая ячейка
            const rightCell = $('<div>').addClass('floor-cell');
            if (floor.userRight !== null) {
                rightCell.text(floor.userRight).addClass('filled');
            } else {
                rightCell.text('?').addClass('empty');
            }

            if (!isCellEditable(index, 'right')) {
                rightCell.addClass('locked');
            }

            rightCell.attr('data-floor', index);
            rightCell.attr('data-side', 'right');
            rightCell.attr('data-value', floor.userRight !== null ? floor.userRight : '');

            row.append(leftCell, rightCell);
            container.append(row);
        });
    }

    // ========== ИНИЦИАЛИЗАЦИЯ DRAG AND DROP ==========
    function initDragDrop() {
        let draggedElement = null;
        let draggedDigit = null;
        let clone = null;
        let startX, startY;
        let currentX, currentY;
        let isDragging = false;

        // Обработчики для мыши
        $(document).on('mousedown', '.digit-item', function(e) {
            e.preventDefault();
            startDrag(this, e.pageX, e.pageY);
        });

        $(document).on('mousemove', function(e) {
            if (isDragging) {
                e.preventDefault();
                moveDrag(e.pageX, e.pageY);
            }
        });

        $(document).on('mouseup', function(e) {
            if (isDragging) {
                e.preventDefault();
                endDrag(e.pageX, e.pageY);
            }
        });

        // Обработчики для touch
        $(document).on('touchstart', '.digit-item', function(e) {
            e.preventDefault();
            const touch = e.originalEvent.touches[0];
            startDrag(this, touch.pageX, touch.pageY);
        });

        $(document).on('touchmove', function(e) {
            if (isDragging) {
                e.preventDefault();
                const touch = e.originalEvent.touches[0];
                moveDrag(touch.pageX, touch.pageY);
            }
        }, { passive: false });

        $(document).on('touchend', function(e) {
            if (isDragging) {
                e.preventDefault();
                const touch = e.originalEvent.changedTouches[0];
                endDrag(touch.pageX, touch.pageY);
            }
        });

        // Функция начала перетаскивания
        function startDrag(element, x, y) {
            draggedElement = element;
            draggedDigit = $(element).data('digit');
            startX = x;
            startY = y;
            isDragging = true;

            // Создаем клон для перетаскивания
            clone = $('<div>', {
                class: 'digit-clone',
                text: draggedDigit,
                css: {
                    left: x - 35,
                    top: y - 35,
                    position: 'fixed',
                    width: '70px',
                    height: '70px',
                    background: '#4caf50',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                    fontWeight: 'bold',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    border: '3px solid white',
                    zIndex: 10000,
                    pointerEvents: 'none',
                    transform: 'scale(1.1)',
                    transition: 'all 0.05s ease'
                }
            });

            $('body').append(clone);

            // Добавляем класс для подсветки целей
            $('.floor-cell.empty:not(.locked), .unknown').addClass('drop-target-active');

            // Скрываем оригинал
            $(draggedElement).css('opacity', '0.3');
        }

        // Функция перемещения
        function moveDrag(x, y) {
            if (!isDragging || !clone) return;

            currentX = x;
            currentY = y;

            // Перемещаем клон
            clone.css({
                left: x - 35,
                top: y - 35
            });

            // Подсвечиваем цель под курсором
            highlightTarget(x, y);
        }

        // Функция завершения перетаскивания
        function endDrag(x, y) {
            if (!isDragging || !clone) return;

            // Находим элемент под курсором
            const target = findTarget(x, y);

            if (target) {
                // Бросаем цифру в цель
                dropDigit(target, draggedDigit);
            }

            // Убираем клон
            clone.remove();
            clone = null;

            // Возвращаем оригинал
            $(draggedElement).css('opacity', '1');

            // Убираем подсветку целей
            $('.floor-cell.empty:not(.locked), .unknown').removeClass('drop-target-active');
            $('.drop-target-highlight').removeClass('drop-target-highlight');

            draggedElement = null;
            isDragging = false;
        }

        // Функция подсветки цели под курсором
        function highlightTarget(x, y) {
            $('.drop-target-highlight').removeClass('drop-target-highlight');

            const target = findTarget(x, y);
            if (target) {
                $(target).addClass('drop-target-highlight');
            }
        }

        // Функция поиска цели под координатами
        function findTarget(x, y) {
            // Сначала проверяем ячейки домика
            const cells = document.elementsFromPoint(x, y);

            for (let element of cells) {
                const $el = $(element);

                // Проверяем ячейки домика
                if ($el.hasClass('floor-cell') && $el.hasClass('empty') && !$el.hasClass('locked')) {
                    return element;
                }

                // Проверяем неизвестные в примере
                if ($el.hasClass('unknown') && $el.is('#example-left, #example-right, #example-result')) {
                    return element;
                }
            }

            return null;
        }

        // Функция бросания цифры в цель
        function dropDigit(target, digit) {
            const $target = $(target);

            if ($target.hasClass('floor-cell')) {
                // Бросаем в ячейку домика
                const floorIndex = $target.data('floor');
                const side = $target.data('side');
                const floor = gameState.floors[floorIndex];

                if (!isCellEditable(floorIndex, side)) {
                    showMessage('Сюда нельзя поставить цифру', '#ffa500');
                    return;
                }

                // Устанавливаем значение
                if (side === 'left') {
                    floor.userLeft = digit;
                } else {
                    floor.userRight = digit;
                }

                gameState.selectedDigit = digit;

                // Анимация успеха
                $target.addClass('drop-success');
                setTimeout(() => $target.removeClass('drop-success'), 500);

                // Обновляем домик
                renderHouse();

                // Активируем этаж
                gameState.selectedFloorIndex = floorIndex;
                gameState.selectedSide = side;

                showMessage(`Цифра ${digit} на месте!`, '#4caf50');

            } else if ($target.hasClass('unknown')) {
                // Бросаем в пример
                const id = $target.attr('id');

                gameState.selectedDigit = digit;

                // Обновляем отображение примера
                if (id === 'example-left') {
                    $('#example-left').text(digit).removeClass('unknown');
                } else if (id === 'example-right') {
                    $('#example-right').text(digit).removeClass('unknown');
                } else if (id === 'example-result') {
                    $('#example-result').text(digit).removeClass('unknown');
                }

                // Анимация успеха
                $target.addClass('drop-success');
                setTimeout(() => $target.removeClass('drop-success'), 500);

                showMessage(`Цифра ${digit} на месте!`, '#4caf50');
            }

            updateUI();
        }

        function showMessage(text, color) {
            $('#game-message').text(text).css('color', color);
            setTimeout(() => $('#game-message').text(''), 1500);
        }
    }

    // ========== СОЗДАНИЕ ЦИФР ДЛЯ ПЕРЕТАСКИВАНИЯ ==========
    function createDigits() {
        const container = $('#digitsContainer');
        container.empty();

        for (let i = 0; i <= 9; i++) {
            const digit = $('<div>')
                .addClass('digit-item')
                .text(i)
                .attr('data-digit', i)
                .attr('draggable', 'false'); // Отключаем нативный drag

            container.append(digit);
        }

        // Инициализируем обработчики touch и mouse
        initDragDrop();
    }

    // ========== НАСТРОЙКА УРОВНЯ ==========
    function setupLevel() {
        const level = gameState.currentLevel;

        gameState.floors.forEach(floor => {
            floor.userLeft = null;
            floor.userRight = null;
        });

        switch(level) {
            case 0:
                gameState.floors[0].userLeft = gameState.floors[0].left;
                gameState.floors[0].userRight = gameState.floors[0].right;
                break;
            case 1:
                gameState.floors.forEach(floor => {
                    floor.userLeft = floor.left;
                });
                break;
            case 2:
                gameState.floors.forEach(floor => {
                    floor.userRight = floor.right;
                });
                break;
            case 3:
                gameState.floors.forEach(floor => {
                    if (Math.random() > 0.5) {
                        floor.userLeft = floor.left;
                    } else {
                        floor.userRight = floor.right;
                    }
                });
                break;
            case 4:
                // Полная пустота
                break;
            case 5:
                gameState.floors.forEach(floor => {
                    floor.userLeft = floor.left;
                    floor.userRight = floor.right;
                });
                break;
            case 6:
                gameState.floors.forEach(floor => {
                    floor.userRight = floor.right;
                });
                break;
            case 7:
                gameState.floors.forEach(floor => {
                    floor.userLeft = floor.left;
                });
                break;
            case 8:
                gameState.floors.forEach(floor => {
                    const unknown = Math.floor(Math.random() * 3);
                    if (unknown === 0) {
                        floor.userRight = floor.right;
                    } else if (unknown === 1) {
                        floor.userLeft = floor.left;
                    } else {
                        floor.userLeft = floor.left;
                        floor.userRight = floor.right;
                    }
                });
                break;
        }

        renderHouse();
    }

    // ========== ЗАГРУЗКА НОВОГО ЧИСЛА ==========
    function loadNumber(number) {
        gameState.floors = generateHouse(number);
        gameState.selectedFloorIndex = 0;
        gameState.selectedSide = 'left';
        gameState.wrongAttempts = 0;
        gameState.lastWrongFloor = null;
        gameState.lastWrongSide = null;

        $('#house-number').text(number);
        $('#current-number').text(number);

        setupLevel();
        updateUI();
    }

    // ========== ПРОВЕРКА ОТВЕТА ==========
    function checkAnswer() {
        const floor = gameState.floors[gameState.selectedFloorIndex];
        const level = gameState.currentLevel;
        let isCorrect = false;

        if (level <= 4) {
            const expectedLeft = floor.left;
            const expectedRight = floor.right;

            if (floor.userLeft === expectedLeft && floor.userRight === expectedRight) {
                isCorrect = true;
            }
        } else {
            const number = gameState.currentNum;

            if (level === 5) {
                // Для 5 уровня нужно проверить, выбрана ли цифра на табло
                // Пока пропускаем, реализуем позже
                isCorrect = true;
            } else if (level === 6) {
                isCorrect = (floor.userLeft === floor.left);
            } else if (level === 7) {
                isCorrect = (floor.userRight === floor.right);
            } else if (level === 8) {
                if (floor.userLeft !== null && floor.userRight !== null) {
                    isCorrect = (floor.userLeft === floor.left && floor.userRight === floor.right);
                } else if (floor.userLeft !== null) {
                    isCorrect = (floor.userLeft === floor.left);
                } else if (floor.userRight !== null) {
                    isCorrect = (floor.userRight === floor.right);
                }
            }
        }

        if (isCorrect) {
            $(`.floor-row`).eq(gameState.selectedFloorIndex).css('background', 'rgba(76, 175, 80, 0.3)');

            gameState.wrongAttempts = 0;
            gameState.lastWrongFloor = null;
            gameState.lastWrongSide = null;

            if (gameState.selectedFloorIndex < gameState.floors.length - 1) {
                gameState.selectedFloorIndex++;
                gameState.selectedSide = 'left';
            } else {
                completeLevel();
                return;
            }

            gameState.score++;
            $('#score-display').text(gameState.score);

            $('#game-message').text('Правильно! ✅').css('color', '#4caf50');
            showCharacter('correct');

            renderHouse();
        } else {
            gameState.wrongAttempts++;
            gameState.lastWrongFloor = gameState.selectedFloorIndex;
            gameState.lastWrongSide = gameState.selectedSide;

            $(`.floor-row`).eq(gameState.selectedFloorIndex).addClass('wrong-answer');
            setTimeout(() => {
                $(`.floor-row`).eq(gameState.selectedFloorIndex).removeClass('wrong-answer');
            }, 500);

            if (gameState.wrongAttempts >= 2) {
                const expectedValue = gameState.selectedSide === 'left' ?
                    gameState.floors[gameState.selectedFloorIndex].left :
                    gameState.floors[gameState.selectedFloorIndex].right;

                $('#game-message').text(`Подсказка: попробуй цифру ${expectedValue}`).css('color', '#ffa500');
            } else {
                $('#game-message').text('Попробуй еще! 🤔').css('color', '#ff6b6b');
            }

            showCharacter('incorrect');
        }

        updateUI();
    }

    // ========== ЗАВЕРШЕНИЕ УРОВНЯ ==========
    function completeLevel() {
        gameState.stars++;
        $('#stars-display').text(gameState.stars);

        if (gameState.currentLevel < 8) {
            gameState.currentLevel++;
            $('#current-level').text(gameState.currentLevel);
            $('#game-message').text('Уровень пройден! ⭐ +1').css('color', '#ffd700');
            setupLevel();
            renderHouse();
        } else {
            gameState.crowns++;
            gameState.currentNum++;
            gameState.currentLevel = 0;

            $('#crowns-display').text(gameState.crowns);
            $('#current-level').text('0');

            if (gameState.currentNum <= 10) {
                $('#game-message').text(`Ура! Число ${gameState.currentNum-1} освоено! 👑 +1`).css('color', '#ffd700');
                loadNumber(gameState.currentNum);
            } else {
                $('#game-message').text('Поздравляю! Ты прошел всю игру! 🎉').css('color', '#ffd700');
            }
        }

        $('#next-button').prop('disabled', true);
        $('#check-button').prop('disabled', false);
    }

    // ========== СБРОС ТЕКУЩЕГО ЭТАЖА ==========
    function resetCurrentFloor() {
        if (gameState.selectedFloorIndex !== null) {
            const floor = gameState.floors[gameState.selectedFloorIndex];
            const level = gameState.currentLevel;

            if (level === 0 && gameState.selectedFloorIndex !== 0) {
                floor.userLeft = null;
                floor.userRight = null;
            } else if (level === 1) {
                floor.userRight = null;
            } else if (level === 2) {
                floor.userLeft = null;
            } else if (level === 5) {
                // Ничего не сбрасываем
            } else {
                floor.userLeft = null;
                floor.userRight = null;
            }

            $(`.floor-row`).eq(gameState.selectedFloorIndex).css('background', '');
            gameState.wrongAttempts = 0;

            renderHouse();
            $('#game-message').text('Этаж очищен').css('color', '#2196f3');
            setTimeout(() => $('#game-message').text(''), 1500);
        }
    }

    // ========== ОБНОВЛЕНИЕ UI ==========
    function updateUI() {
        $('#score-display').text(gameState.score);
        $('#stars-display').text(gameState.stars);
        $('#crowns-display').text(gameState.crowns);
        $('#current-level').text(gameState.currentLevel);
        $('#current-number').text(gameState.currentNum);
        $('#house-number').text(gameState.currentNum);
    }

    // ========== ЗАПУСК СЛУЧАЙНЫХ ПОДБАДРИВАНИЙ ==========
    function startRandomCharacterTimer() {
        setInterval(() => {
            if (Math.random() < 0.1) {
                showCharacter('random');
            }
        }, 120000);
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ИГРЫ ==========
    function initGame() {
        createDigits();
        loadNumber(gameState.currentNum);
        $('#gameWrapper').css('opacity', '1');
        startRandomCharacterTimer();
    }

    // ========== ЗАГРУЗКА РЕСУРСОВ ==========
    ResourceManager.init(
        characters,
        phrases,
        (loaded, total) => {
            const percent = Math.round((loaded / total) * 100);
            $('#loadingProgress').css('width', percent + '%');
            $('#loadingStatus').text(percent + '%');
        },
        () => {
            $('#loadingScreen').addClass('hidden');
            initGame();
        }
    );

    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

    // Клик по ячейке для активации
    $(document).on('click', '.floor-cell', function() {
        if (gameState.dragActive) return;

        const floorIndex = $(this).data('floor');
        const side = $(this).data('side');

        gameState.selectedFloorIndex = floorIndex;
        gameState.selectedSide = side;

        $('.floor-row').removeClass('active-floor');
        $(`.floor-row`).eq(floorIndex).addClass('active-floor');

        updateUI();
    });

    // Кнопка проверки
    $('#check-button').click(function() {
        checkAnswer();
    });

    // Кнопка "Дальше"
    $('#next-button').click(function() {
        if (gameState.currentLevel < 8) {
            gameState.currentLevel++;
            setupLevel();
            renderHouse();
        }
        $(this).prop('disabled', true);
        $('#check-button').prop('disabled', false);
    });

    // Кнопка сброса этажа
    $('#reset-floor-button').click(function() {
        resetCurrentFloor();
    });

    // Кнопка сброса всего уровня
    $('#reset-all-button').click(function() {
        setupLevel();
        gameState.selectedFloorIndex = 0;
        gameState.selectedSide = 'left';
        gameState.wrongAttempts = 0;
        gameState.lastWrongFloor = null;
        gameState.lastWrongSide = null;

        renderHouse();
        $('#game-message').text('Уровень начат заново').css('color', '#2196f3');
        setTimeout(() => $('#game-message').text(''), 1500);

        updateUI();
    });

    // Предотвращаем стандартное поведение drag-and-drop на мобильных
    $(document).on('touchmove', function(e) {
        if (gameState.dragActive) {
            e.preventDefault();
        }
    });

    // ========== ДОБАВЛЯЕМ НОВЫЕ ФУНКЦИИ ==========

// Отображение примера вместо домика
    function showExample(level) {
        const number = gameState.currentNum;
        const floor = gameState.floors[gameState.selectedFloorIndex];

        let leftValue, rightValue, result, unknownPos;

        switch(level) {
            case 5: // A + B = ?
                leftValue = floor.left;
                rightValue = floor.right;
                result = '?';
                unknownPos = 'result';
                break;
            case 6: // ? + B = C
                leftValue = '?';
                rightValue = floor.right;
                result = number;
                unknownPos = 'left';
                break;
            case 7: // A + ? = C
                leftValue = floor.left;
                rightValue = '?';
                result = number;
                unknownPos = 'right';
                break;
            case 8: // Случайно
                const random = Math.floor(Math.random() * 3);
                if (random === 0) {
                    leftValue = '?';
                    rightValue = floor.right;
                    result = number;
                    unknownPos = 'left';
                } else if (random === 1) {
                    leftValue = floor.left;
                    rightValue = '?';
                    result = number;
                    unknownPos = 'right';
                } else {
                    leftValue = floor.left;
                    rightValue = floor.right;
                    result = '?';
                    unknownPos = 'result';
                }
                break;
        }

        // Обновляем отображение
        $('#example-left').text(leftValue).removeClass('unknown');
        $('#example-right').text(rightValue).removeClass('unknown');
        $('#example-result').text(result).removeClass('unknown');

        // Подсвечиваем неизвестное
        if (unknownPos === 'left') {
            $('#example-left').addClass('unknown').text('?');
        } else if (unknownPos === 'right') {
            $('#example-right').addClass('unknown').text('?');
        } else if (unknownPos === 'result') {
            $('#example-result').addClass('unknown').text('?');
        }

        // Сохраняем позицию неизвестного в gameState
        gameState.unknownPos = unknownPos;

        // Показываем пример, скрываем домик
        $('.house-container').hide();
        $('#exampleContainer').show();
    }

// Проверка ответа для уравнений
    function checkEquationAnswer() {
        const level = gameState.currentLevel;
        const number = gameState.currentNum;
        const floor = gameState.floors[gameState.selectedFloorIndex];
        const unknownPos = gameState.unknownPos;
        const selectedDigit = gameState.selectedDigit;

        let isCorrect = false;

        if (!selectedDigit && selectedDigit !== 0) {
            $('#game-message').text('Сначала перетащи цифру!').css('color', '#ffa500');
            return;
        }

        if (level === 5) { // A+B=?
            isCorrect = (selectedDigit === number);
        } else if (level === 6) { // ?+B=C
            isCorrect = (selectedDigit === floor.left);
        } else if (level === 7) { // A+?=C
            isCorrect = (selectedDigit === floor.right);
        } else if (level === 8) {
            if (unknownPos === 'left') {
                isCorrect = (selectedDigit === floor.left);
            } else if (unknownPos === 'right') {
                isCorrect = (selectedDigit === floor.right);
            } else {
                isCorrect = (selectedDigit === number);
            }
        }

        if (isCorrect) {
            // Правильный ответ
            $('#example-box').effect('highlight', { color: '#4caf50' }, 500);

            gameState.wrongAttempts = 0;

            if (gameState.selectedFloorIndex < gameState.floors.length - 1) {
                gameState.selectedFloorIndex++;
                // Обновляем пример для следующего этажа
                showExample(level);
            } else {
                // Все этажи решены
                completeLevel();
                return;
            }

            gameState.score++;
            $('#score-display').text(gameState.score);
            $('#game-message').text('Правильно! ✅').css('color', '#4caf50');
            showCharacter('correct');

            // Сбрасываем выбранную цифру
            gameState.selectedDigit = null;
        } else {
            // Неправильный ответ
            gameState.wrongAttempts++;

            $('#example-box').effect('shake', { times: 3, distance: 5 }, 300);

            if (gameState.wrongAttempts >= 2) {
                let expectedValue;
                if (unknownPos === 'left') {
                    expectedValue = floor.left;
                } else if (unknownPos === 'right') {
                    expectedValue = floor.right;
                } else {
                    expectedValue = number;
                }

                $('#game-message').text(`Подсказка: попробуй цифру ${expectedValue}`).css('color', '#ffa500');
            } else {
                $('#game-message').text('Попробуй еще! 🤔').css('color', '#ff6b6b');
            }

            showCharacter('incorrect');
        }
    }

// Обновляем функцию setupLevel
    function setupLevel() {
        const level = gameState.currentLevel;

        gameState.floors.forEach(floor => {
            floor.userLeft = null;
            floor.userRight = null;
        });

        // Сбрасываем выбранную цифру
        gameState.selectedDigit = null;

        switch(level) {
            case 0:
                gameState.floors[0].userLeft = gameState.floors[0].left;
                gameState.floors[0].userRight = gameState.floors[0].right;
                $('.house-container').show();
                $('#exampleContainer').hide();
                break;
            case 1:
                gameState.floors.forEach(floor => {
                    floor.userLeft = floor.left;
                });
                $('.house-container').show();
                $('#exampleContainer').hide();
                break;
            case 2:
                gameState.floors.forEach(floor => {
                    floor.userRight = floor.right;
                });
                $('.house-container').show();
                $('#exampleContainer').hide();
                break;
            case 3:
                gameState.floors.forEach(floor => {
                    if (Math.random() > 0.5) {
                        floor.userLeft = floor.left;
                    } else {
                        floor.userRight = floor.right;
                    }
                });
                $('.house-container').show();
                $('#exampleContainer').hide();
                break;
            case 4:
                $('.house-container').show();
                $('#exampleContainer').hide();
                break;
            case 5:
            case 6:
            case 7:
            case 8:
                showExample(level);
                break;
        }

        renderHouse();
    }

// Обновляем функцию checkAnswer
    function checkAnswer() {
        const level = gameState.currentLevel;

        // Для уровней 5-8 используем проверку уравнений
        if (level >= 5 && level <= 8) {
            checkEquationAnswer();
            return;
        }

        const floor = gameState.floors[gameState.selectedFloorIndex];
        let isCorrect = false;

        const expectedLeft = floor.left;
        const expectedRight = floor.right;

        if (floor.userLeft === expectedLeft && floor.userRight === expectedRight) {
            isCorrect = true;
        }

        if (isCorrect) {
            $(`.floor-row`).eq(gameState.selectedFloorIndex).css('background', 'rgba(76, 175, 80, 0.3)');

            gameState.wrongAttempts = 0;
            gameState.lastWrongFloor = null;
            gameState.lastWrongSide = null;

            if (gameState.selectedFloorIndex < gameState.floors.length - 1) {
                gameState.selectedFloorIndex++;
                gameState.selectedSide = 'left';
            } else {
                completeLevel();
                return;
            }

            gameState.score++;
            $('#score-display').text(gameState.score);

            $('#game-message').text('Правильно! ✅').css('color', '#4caf50');
            showCharacter('correct');

            renderHouse();
        } else {
            gameState.wrongAttempts++;
            gameState.lastWrongFloor = gameState.selectedFloorIndex;
            gameState.lastWrongSide = gameState.selectedSide;

            $(`.floor-row`).eq(gameState.selectedFloorIndex).addClass('wrong-answer');
            setTimeout(() => {
                $(`.floor-row`).eq(gameState.selectedFloorIndex).removeClass('wrong-answer');
            }, 500);

            if (gameState.wrongAttempts >= 2) {
                const expectedValue = gameState.selectedSide === 'left' ?
                    gameState.floors[gameState.selectedFloorIndex].left :
                    gameState.floors[gameState.selectedFloorIndex].right;

                $('#game-message').text(`Подсказка: попробуй цифру ${expectedValue}`).css('color', '#ffa500');
            } else {
                $('#game-message').text('Попробуй еще! 🤔').css('color', '#ff6b6b');
            }

            showCharacter('incorrect');
        }

        updateUI();
    }

// Обновляем функцию completeLevel
    function completeLevel() {
        gameState.stars++;
        $('#stars-display').text(gameState.stars);

        if (gameState.currentLevel < 8) {
            gameState.currentLevel++;
            $('#current-level').text(gameState.currentLevel);
            $('#game-message').text('Уровень пройден! ⭐ +1').css('color', '#ffd700');

            // Сбрасываем выбранный этаж
            gameState.selectedFloorIndex = 0;
            gameState.selectedSide = 'left';
            gameState.selectedDigit = null;

            setupLevel();
            renderHouse();
        } else {
            gameState.crowns++;
            gameState.currentNum++;
            gameState.currentLevel = 0;

            $('#crowns-display').text(gameState.crowns);
            $('#current-level').text('0');

            if (gameState.currentNum <= 10) {
                $('#game-message').text(`Ура! Число ${gameState.currentNum-1} освоено! 👑 +1`).css('color', '#ffd700');
                gameState.selectedFloorIndex = 0;
                gameState.selectedSide = 'left';
                gameState.selectedDigit = null;
                loadNumber(gameState.currentNum);
            } else {
                $('#game-message').text('Поздравляю! Ты прошел всю игру! 🎉').css('color', '#ffd700');
            }
        }

        $('#next-button').prop('disabled', true);
        $('#check-button').prop('disabled', false);
    }

// Обновляем функцию resetCurrentFloor
    function resetCurrentFloor() {
        const level = gameState.currentLevel;

        // Для уровней с уравнениями
        if (level >= 5 && level <= 8) {
            gameState.selectedDigit = null;
            showExample(level);
            $('#game-message').text('Пример сброшен').css('color', '#2196f3');
            setTimeout(() => $('#game-message').text(''), 1500);
            return;
        }

        if (gameState.selectedFloorIndex !== null) {
            const floor = gameState.floors[gameState.selectedFloorIndex];

            if (level === 0 && gameState.selectedFloorIndex !== 0) {
                floor.userLeft = null;
                floor.userRight = null;
            } else if (level === 1) {
                floor.userRight = null;
            } else if (level === 2) {
                floor.userLeft = null;
            } else {
                floor.userLeft = null;
                floor.userRight = null;
            }

            $(`.floor-row`).eq(gameState.selectedFloorIndex).css('background', '');
            gameState.wrongAttempts = 0;

            renderHouse();
            $('#game-message').text('Этаж очищен').css('color', '#2196f3');
            setTimeout(() => $('#game-message').text(''), 1500);
        }
    }

// Обновляем функцию resetAll
    $('#reset-all-button').click(function() {
        const level = gameState.currentLevel;

        if (level >= 5 && level <= 8) {
            gameState.selectedFloorIndex = 0;
            gameState.selectedDigit = null;
            gameState.wrongAttempts = 0;
            showExample(level);
        } else {
            setupLevel();
            gameState.selectedFloorIndex = 0;
            gameState.selectedSide = 'left';
            gameState.wrongAttempts = 0;
            gameState.lastWrongFloor = null;
            gameState.lastWrongSide = null;
            renderHouse();
        }

        $('#game-message').text('Уровень начат заново').css('color', '#2196f3');
        setTimeout(() => $('#game-message').text(''), 1500);

        updateUI();
    });

// Обновляем initDroppable для поддержки уравнений
    function initDroppable() {
        // Для обычных ячеек домика
        $('.floor-cell.empty:not(.locked)').droppable({
            accept: '.digit-item',
            hoverClass: 'ui-droppable-hover',

            drop: function(event, ui) {
                const floorIndex = $(this).data('floor');
                const side = $(this).data('side');
                const digit = ui.draggable.data('digit');
                const floor = gameState.floors[floorIndex];

                if (!isCellEditable(floorIndex, side)) {
                    $('#game-message').text('Сюда нельзя поставить цифру').css('color', '#ffa500');
                    setTimeout(() => $('#game-message').text(''), 1500);
                    return;
                }

                if (side === 'left') {
                    floor.userLeft = digit;
                } else {
                    floor.userRight = digit;
                }

                gameState.selectedDigit = digit;

                if (gameState.lastWrongFloor === floorIndex && gameState.lastWrongSide === side) {
                    $(`.floor-row`).eq(floorIndex).css('background', '');
                }

                $(this).addClass('drop-success');
                setTimeout(() => {
                    $(this).removeClass('drop-success');
                }, 500);

                renderHouse();

                gameState.selectedFloorIndex = floorIndex;
                gameState.selectedSide = side;

                updateUI();
            }
        });

        // Для примера (уровни 5-8)
        $('#example-left.unknown, #example-right.unknown, #example-result.unknown').droppable({
            accept: '.digit-item',
            hoverClass: 'ui-droppable-hover',

            drop: function(event, ui) {
                const digit = ui.draggable.data('digit');
                const id = $(this).attr('id');

                gameState.selectedDigit = digit;

                // Визуально обновляем пример
                if (id === 'example-left') {
                    $('#example-left').text(digit).removeClass('unknown');
                } else if (id === 'example-right') {
                    $('#example-right').text(digit).removeClass('unknown');
                } else if (id === 'example-result') {
                    $('#example-result').text(digit).removeClass('unknown');
                }

                $(this).addClass('drop-success');
                setTimeout(() => {
                    $(this).removeClass('drop-success');
                }, 500);

                $('#game-message').text(`Цифра ${digit} на месте!`).css('color', '#4caf50');
                setTimeout(() => $('#game-message').text(''), 1000);

                updateUI();
            }
        });
    }
});