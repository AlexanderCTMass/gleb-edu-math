// ========== ГЛАВНЫЙ ФАЙЛ ИНИЦИАЛИЗАЦИИ ==========
$(document).ready(function() {
    // Предотвращаем скролл страницы при перетаскивании
    document.addEventListener('touchmove', function(e) {
        if (GameState.getProp('dragActive')) {
            e.preventDefault();
        }
    }, { passive: false });

    // Инициализация ресурсов
    ResourceManager.init(
        Characters,
        Phrases,
        (loaded, total) => {
            const percent = Math.round((loaded / total) * 100);
            $('#loadingProgress').css('width', percent + '%');
            $('#loadingStatus').text(percent + '%');
        },
        () => {
            $('#loadingScreen').addClass('hidden');
            startGame();
        }
    );

    function startGame() {
        // Создаем цифры для перетаскивания
        DragDropManager.createDigits($('#digitsContainer'));

        // Инициализируем DragDrop с колбэком
        DragDropManager.init((target, digit) => {
            GameLogic.handleDrop(target, digit);
        });

        // Инициализируем UI
        UIManager.init();

        // Запускаем игру
        GameLogic.init();

        // Показываем игровой экран
        $('#gameWrapper').css('opacity', '1');

        // Запускаем таймер случайных персонажей
        CharacterManager.startRandomTimer();
    }

    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

    // Клик по ячейке для активации
    $(document).on('click', '.floor-cell', function() {
        if (GameState.getProp('dragActive')) return;

        const floorIndex = $(this).data('floor');
        const side = $(this).data('side');

        GameState.update('selectedFloorIndex', floorIndex);
        GameState.update('selectedSide', side);

        $('.floor-row').removeClass('active-floor');
        $(`.floor-row`).eq(floorIndex).addClass('active-floor');
    });

    // Кнопка проверки
    $('#check-button').click(function() {
        GameLogic.checkAnswer();
    });

    // Кнопка "Дальше"
    $('#next-button').click(function() {
        const level = GameState.getProp('currentLevel');
        if (level < 8) {
            GameState.nextLevel();
            GameLogic.setupLevel();
        }
        $(this).prop('disabled', true);
        $('#check-button').prop('disabled', false);
    });

    // Кнопка сброса этажа
    $('#reset-floor-button').click(function() {
        GameLogic.resetCurrentFloor();
    });

    // Кнопка сброса всего уровня
    $('#reset-all-button').click(function() {
        GameLogic.resetAll();
    });
});