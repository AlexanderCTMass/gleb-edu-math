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
            $('#voiceToggleBtn').hide();
            $('#autoVoiceToggleBtn').hide();
        } else {
            // Инициализируем состояние кнопок озвучки
            updateVoiceButtons();
        }
    }

    // Обновление состояния кнопок озвучки
    function updateVoiceButtons() {
        const state = GameState.get();

        // Кнопка вкл/выкл озвучки
        if (state.voiceEnabled) {
            $('#voiceToggleBtn').removeClass('disabled');
            $('#voiceIcon').text('🔊');
        } else {
            $('#voiceToggleBtn').addClass('disabled');
            $('#voiceIcon').text('🔇');
        }

        // Кнопка автоозвучки
        if (state.autoVoice) {
            $('#autoVoiceToggleBtn').addClass('active');
            $('#autoVoiceIcon').text('🎤');
        } else {
            $('#autoVoiceToggleBtn').removeClass('active');
            $('#autoVoiceIcon').text('🎤');
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

    // Обработчик для кнопки озвучки (уровень 0)
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

    // Обработчик для кнопки вкл/выкл озвучки
    $('#voiceToggleBtn').click(function() {
        const newState = GameState.toggleVoice();

        if (!newState) {
            // Если выключили озвучку, останавливаем текущую
            VoiceService.stopSpeaking();
        }

        updateVoiceButtons();
        UIManager.showMessage(
            newState ? 'Озвучка включена' : 'Озвучка выключена',
            newState ? '#4caf50' : '#f44336'
        );
    });

    // Обработчик для кнопки автоозвучки
    $('#autoVoiceToggleBtn').click(function() {
        const newState = GameState.toggleAutoVoice();
        updateVoiceButtons();
        UIManager.showMessage(
            newState ? 'Автоозвучка включена' : 'Автоозвучка выключена',
            newState ? '#4caf50' : '#ff9800'
        );

        // Если включили автоозвучку на текущем уровне, озвучиваем вопрос
        if (newState && GameState.getProp('currentLevel') > 0) {
            setTimeout(() => GameLogic.speakCurrentQuestion(), 300);
        }
    });

    // ===== ИСПРАВЛЕННЫЙ ОБРАБОТЧИК ДЛЯ КНОПКИ СБРОСА =====
    // Используем делегирование событий или прямой селектор
    $(document).on('click', '#resetGameBtn', function() {
        console.log('Reset button clicked');
        $('#resetModal').fadeIn(200);
    });

    // Отмена сброса
    $('#cancelReset').click(function() {
        $('#resetModal').fadeOut(200);
    });

    // Подтверждение сброса
    $('#confirmReset').click(function() {
        console.log('Reset confirmed');
        $('#resetModal').fadeOut(200);

        UIManager.showMessage('Игра начинается сначала!', '#ffd700');

        // Останавливаем озвучку
        VoiceService.stopSpeaking();

        // Сбрасываем счетчики озвучки
        VoiceService.resetCounters();

        // Сбрасываем состояние игры
        GameState.resetGame();

        // Сбрасываем историю персонажей
        CharacterManager.resetHistory();

        // Обновляем кнопки
        updateVoiceButtons();

        // Перезагружаем игру с числа 2
        GameLogic.loadNumber(2);
    });

    // Закрытие модального окна при клике на оверлей
    $('#resetModal').click(function(e) {
        if ($(e.target).is('#resetModal')) {
            $(this).fadeOut(200);
        }
    });

    // Подписываемся на изменения состояния для обновления кнопок
    GameState.subscribe((state) => {
        if (state.currentLevel !== 0) {
            VoiceService.stopSpeaking();
        }
        updateVoiceButtons();
    });
});