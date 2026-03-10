// ========== ГЛАВНЫЙ ФАЙЛ ИНИЦИАЛИЗАЦИИ ==========
$(document).ready(function() {
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
        UIManager.init();
        GameLogic.init();
        $('#gameWrapper').css('opacity', '1');
        CharacterManager.startRandomTimer();

        // Проверяем поддержку озвучки
        if (!VoiceService.isSupported()) {
            console.log('Speech synthesis not supported');
            $('#speakButton').hide();
        }
    }

    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

    $('#option1, #option2, #option3').click(function() {
        if ($(this).hasClass('disabled')) {
            console.log('Button is disabled');
            return;
        }
        if (GameState.getProp('currentLevel') === 0) return;

        const selectedValue = parseInt($(this).text());
        GameLogic.selectOption(selectedValue);
    });

    // Обработчик для кнопки озвучки
    $('#speakButton').click(function() {
        if ($(this).hasClass('speaking')) {
            VoiceService.stopSpeaking();
            $(this).removeClass('speaking');
        } else {
            const state = GameState.get();
            if (state.currentLevel === 0) {
                VoiceService.speakNumberComposition(state.currentNum, state.floors);
            }
        }
    });

    // Обработчик для кнопки сброса игры
    $('#resetGameBtn').click(function() {
        $('#resetModal').fadeIn(200);
    });

    // Отмена сброса
    $('#cancelReset').click(function() {
        $('#resetModal').fadeOut(200);
    });

    // Подтверждение сброса
    $('#confirmReset').click(function() {
        $('#resetModal').fadeOut(200);

        // Показываем сообщение
        UIManager.showMessage('Игра начинается сначала!', '#ffd700');

        // Сбрасываем состояние игры
        GameState.resetGame();

        // Сбрасываем историю персонажей
        CharacterManager.resetHistory();

        // Останавливаем текущую озвучку
        VoiceService.stopSpeaking();

        // Перезагружаем игру с числа 2
        GameLogic.loadNumber(2);
    });

    // Закрытие модального окна при клике на оверлей
    $('#resetModal').click(function(e) {
        if ($(e.target).is('#resetModal')) {
            $(this).fadeOut(200);
        }
    });

    // Останавливаем озвучку при переходе на другой уровень
    GameState.subscribe((state) => {
        if (state.currentLevel !== 0) {
            VoiceService.stopSpeaking();
        }
    });
});