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

        VoiceService.registerGame('syllableGame', {
            getVoiceEnabled: () => SyllableGameState.getProp('voiceEnabled'),
            setVoiceEnabled: (enabled) => SyllableGameState.update('voiceEnabled', enabled),
            getAutoVoiceEnabled: () => SyllableGameState.getProp('autoVoice'),
            setAutoVoiceEnabled: (enabled) => SyllableGameState.update('autoVoice', enabled),
            onStartSpeaking: () => $('#syllableSpeakButton').addClass('speaking'),
            onStopSpeaking: () => $('#syllableSpeakButton').removeClass('speaking')
        });

        // Переключаемся на слоговую игру
        VoiceService.setCurrentGame('syllableGame');

        // Проверка поддержки озвучки
        if (!VoiceService.isSupported()) {
            $('#speakSyllableBtn, #repeatQuestionBtn, #voiceToggleBtn, #autoVoiceToggleBtn').hide();
        } else {
            updateVoiceButtons();
        }
    }

    function updateVoiceButtons() {
        const state = SyllableGameState.get();

        if (state.voiceEnabled) {
            $('#voiceToggleBtn').removeClass('disabled');
            $('#voiceIcon').text('🔊');
        } else {
            $('#voiceToggleBtn').addClass('disabled');
            $('#voiceIcon').text('🔇');
        }

        if (state.autoVoice) {
            $('#autoVoiceToggleBtn').addClass('active');
        } else {
            $('#autoVoiceToggleBtn').removeClass('active');
        }
    }

    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

    // Озвучка слога в обучении
    $('#speakSyllableBtn').click(function() {
        SyllableGameLogic.speakCurrentSyllable();
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
        const newState = SyllableGameState.toggleVoice();
        if (!newState) VoiceService.stopSpeaking();
        updateVoiceButtons();
        UIManager.showMessage(
            newState ? 'Озвучка включена' : 'Озвучка выключена',
            newState ? '#4caf50' : '#f44336'
        );
    });

    $('#autoVoiceToggleBtn').click(function() {
        const newState = SyllableGameState.toggleAutoVoice();
        updateVoiceButtons();
        UIManager.showMessage(
            newState ? 'Автоозвучка включена' : 'Автоозвучка выключена',
            newState ? '#4caf50' : '#ff9800'
        );
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
        VoiceService.stopSpeaking();
        CharacterManager.resetHistory();
        SyllableGameState.resetGame();
        updateVoiceButtons();
        SyllableGameLogic.init();
    });

    // Подписка на изменения состояния
    SyllableGameState.subscribe((state) => {
        updateVoiceButtons();
    });
});