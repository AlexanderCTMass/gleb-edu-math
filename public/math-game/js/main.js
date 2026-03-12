// ========== ГЛАВНЫЙ ФАЙЛ МАТЕМАТИЧЕСКОЙ ИГРЫ ==========
$(document).ready(function() {
    // Проверяем, какой браузер используется
    const isYandexBrowser = /YaBrowser/i.test(navigator.userAgent);

    if (isYandexBrowser) {
        console.log('🎉 Яндекс.Браузер detected! Using built-in Alice');
    }

    // Загрузка ресурсов
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
        if (!MathVoiceService.isSupported()) {
            console.log('No speech support');
            $('#speakButton').hide();
            $('#voiceToggleBtn').hide();
            $('#autoVoiceToggleBtn').hide();
        } else {
            // Показываем информацию об используемом голосе
            const browserInfo = MathVoiceService.getBrowserInfo();
            if (browserInfo.isYandexBrowser && browserInfo.hasYandexSpeaker) {
                UIManager.showMessage('Алиса готова помогать! 🎤', '#4caf50');
                $('#voiceIcon').text('🎤');
            }

            updateVoiceButtons();
        }

        // Подписываемся на изменения состояния
        GameState.subscribe((state) => {
            if (state.currentLevel !== 0) {
                // Не останавливаем автоматически, только если нужно
                // MathVoiceService.stopSpeaking();
            }
            updateVoiceButtons();
        });
    }

    // Обновление состояния кнопок озвучки
    function updateVoiceButtons() {
        const state = GameState.get();
        const browserInfo = MathVoiceService.getBrowserInfo();

        // Кнопка вкл/выкл озвучки
        if (state.voiceEnabled) {
            $('#voiceToggleBtn').removeClass('disabled');
            if (browserInfo.isYandexBrowser && browserInfo.hasYandexSpeaker) {
                $('#voiceIcon').text('🎤'); // Иконка Алисы для Яндекс.Браузера
            } else {
                $('#voiceIcon').text('🔊');
            }
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
        if ($(this).hasClass('disabled')) return;
        if (GameState.getProp('currentLevel') === 0) return;

        const selectedValue = parseInt($(this).text());
        GameLogic.selectOption(selectedValue);
    });

    $('#speakButton').click(function() {
        if ($(this).hasClass('speaking')) {
            MathVoiceService.stopSpeaking();
            $(this).removeClass('speaking');
        } else {
            const state = GameState.get();
            if (state.currentLevel === 0) {
                MathVoiceService.speakNumberComposition(state.currentNum, state.floors);
            } else {
                GameLogic.speakCurrentQuestion();
            }
        }
    });

    $('#voiceToggleBtn').click(function() {
        const newState = MathVoiceService.toggleVoice();

        // Синхронизируем с GameState
        GameState.update('voiceEnabled', newState);

        if (!newState) {
            MathVoiceService.stopSpeaking();
        }

        updateVoiceButtons();
        UIManager.showMessage(
            newState ? 'Озвучка включена' : 'Озвучка выключена',
            newState ? '#4caf50' : '#f44336'
        );
    });

    $('#autoVoiceToggleBtn').click(function() {
        const newState = MathVoiceService.toggleAutoVoice();

        // Синхронизируем с GameState
        GameState.update('autoVoice', newState);

        updateVoiceButtons();
        UIManager.showMessage(
            newState ? 'Автоозвучка включена' : 'Автоозвучка выключена',
            newState ? '#4caf50' : '#ff9800'
        );

        if (newState && GameState.getProp('currentLevel') > 0) {
            setTimeout(() => GameLogic.speakCurrentQuestion(), 300);
        }
    });

    // Сброс игры
    $(document).on('click', '#resetGameBtn', function() {
        $('#resetModal').fadeIn(200);
    });

    $('#cancelReset').click(function() {
        $('#resetModal').fadeOut(200);
    });

    $('#confirmReset').click(function() {
        $('#resetModal').fadeOut(200);

        UIManager.showMessage('Игра начинается сначала!', '#ffd700');
        MathVoiceService.stopSpeaking();
        MathVoiceService.resetCounters();
        GameState.resetGame();
        CharacterManager.resetHistory();
        updateVoiceButtons();
        GameLogic.loadNumber(2);
    });

    $('#resetModal').click(function(e) {
        if ($(e.target).is('#resetModal')) {
            $(this).fadeOut(200);
        }
    });

    // Обработка переключения вкладок/страниц
    $(window).on('blur', function() {
        // При уходе со страницы останавливаем озвучку
        MathVoiceService.stopSpeaking();
    });
});