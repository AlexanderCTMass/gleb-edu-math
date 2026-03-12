// ========== ГЛАВНЫЙ ФАЙЛ ДЛЯ ИГРЫ СО СЛОГАМИ ==========
$(document).ready(function() {
    // Проверка браузера
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
        $('#gameWrapper').css('opacity', '1');

        // Инициализация
        UIManager.init(SyllableGameState);
        SyllableGameLogic.init();
        CharacterManager.startRandomTimer();

        // Проверка поддержки озвучки
        if (!SyllableVoiceService.isSupported()) {
            $('#speakSyllableBtn, #repeatQuestionBtn, #voiceToggleBtn, #autoVoiceToggleBtn').hide();
        } else {
            updateVoiceButtons();
        }

        // Подписываемся на изменения состояния
        SyllableGameState.subscribe((state) => {
            updateVoiceButtons();
        });
    }

    function updateVoiceButtons() {
        const state = SyllableGameState.get();

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

    // Озвучка слога в обучении
    $('#speakSyllableBtn').click(function() {
        if ($(this).hasClass('speaking')) {
            SyllableVoiceService.stopSpeaking();
            $(this).removeClass('speaking');
        } else {
            SyllableGameLogic.speakCurrentSyllable();
        }
    });

    // Кнопка "Следующий слог"
    $('#nextSyllableBtn').click(function() {
        SyllableGameLogic.nextSyllable();
    });

    // Повтор задания в тесте
    $('#repeatQuestionBtn').click(function() {
        SyllableGameLogic.speakCurrentQuestion();
    });

    // Выбор ответа
    $('#option1, #option2, #option3, #option4').click(function() {
        if ($(this).hasClass('disabled')) return;

        const selectedSyllable = $(this).text();
        SyllableGameLogic.selectOption(selectedSyllable);
    });

    // Кнопки управления озвучкой
    $('#voiceToggleBtn').click(function() {
        const newState = SyllableVoiceService.toggleVoice();

        // Синхронизируем с SyllableGameState
        SyllableGameState.update('voiceEnabled', newState);

        if (!newState) {
            SyllableVoiceService.stopSpeaking();
        }

        updateVoiceButtons();
        UIManager.showMessage(
            newState ? 'Озвучка включена' : 'Озвучка выключена',
            newState ? '#4caf50' : '#f44336'
        );
    });

    $('#autoVoiceToggleBtn').click(function() {
        const newState = SyllableVoiceService.toggleAutoVoice();

        // Синхронизируем с SyllableGameState
        SyllableGameState.update('autoVoice', newState);

        updateVoiceButtons();
        UIManager.showMessage(
            newState ? 'Автоозвучка включена' : 'Автоозвучка выключена',
            newState ? '#4caf50' : '#ff9800'
        );

        if (newState && SyllableGameState.getProp('currentMode') === 'testing') {
            setTimeout(() => SyllableGameLogic.speakCurrentQuestion(), 300);
        }
    });

    // Сброс игры
    $('#resetGameBtn').click(function() {
        $('#resetModal').fadeIn(200);
    });

    $('#cancelReset, #resetModal').click(function(e) {
        if (e.target === this || $(e.target).is('#cancelReset')) {
            $('#resetModal').fadeOut(200);
        }
    });

    $('#confirmReset').click(function() {
        $('#resetModal').fadeOut(200);

        UIManager.showMessage('Игра начинается сначала!', '#ffd700');
        SyllableVoiceService.stopSpeaking();
        SyllableVoiceService.resetCounters();
        CharacterManager.resetHistory();
        SyllableGameState.resetGame();
        updateVoiceButtons();
        SyllableGameLogic.init();
    });

    // Обработка переключения вкладок/страниц
    $(window).on('blur', function() {
        // При уходе со страницы останавливаем озвучку
        SyllableVoiceService.stopSpeaking();
    });
});