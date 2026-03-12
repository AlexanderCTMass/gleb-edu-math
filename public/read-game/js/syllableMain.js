// ========== ГЛАВНЫЙ ФАЙЛ ДЛЯ ИГРЫ СО СЛОГАМИ ==========
$(document).ready(function() {
    console.log('Syllable main.js started');

    // Проверка браузера
    const isYandexBrowser = /YaBrowser/i.test(navigator.userAgent);

    if (isYandexBrowser) {
        console.log('🎉 Яндекс.Браузер detected! Using built-in Alice');
    }

    // Определяем, какие данные использовать
    const characters = (window.SyllableGame && SyllableGame.Characters) || window.Characters || [];
    const phrases = (window.SyllableGame && SyllableGame.Phrases) || window.Phrases || [];

    // Загрузка ресурсов
    if (typeof ResourceManager === 'undefined') {
        console.error('ResourceManager not found!');
        $('#loadingStatus').text('Ошибка загрузки ресурсов');
        return;
    }

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
            startGame();
        }
    );

    function startGame() {
        console.log('Starting syllable game...');

        $('#gameWrapper').css('opacity', '1');

        // Инициализация
        if (typeof UIManager !== 'undefined') {
            UIManager.init(SyllableGameState);
        }

        if (typeof SyllableGameLogic !== 'undefined') {
            SyllableGameLogic.init();
        }

        if (typeof SyllableCharacterManager !== 'undefined') {
            SyllableCharacterManager.startRandomTimer();
        }

        // Проверка поддержки озвучки
        const voiceSupported = typeof SyllableVoiceService !== 'undefined' &&
            SyllableVoiceService.isSupported &&
            SyllableVoiceService.isSupported();

        if (!voiceSupported) {
            $('#speakSyllableBtn, #repeatQuestionBtn, #voiceToggleBtn, #autoVoiceToggleBtn').hide();
        } else {
            updateVoiceButtons();
        }

        // Подписываемся на изменения состояния
        if (typeof SyllableGameState !== 'undefined') {
            SyllableGameState.subscribe((state) => {
                updateVoiceButtons();
            });
        }
    }

    function updateVoiceButtons() {
        if (typeof SyllableGameState === 'undefined') return;

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
            $('#autoVoiceIcon').text('🎤');
        } else {
            $('#autoVoiceToggleBtn').removeClass('active');
            $('#autoVoiceIcon').text('🎤');
        }
    }

    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

    $('#speakSyllableBtn').click(function() {
        if (typeof SyllableVoiceService === 'undefined') return;

        if ($(this).hasClass('speaking')) {
            SyllableVoiceService.stopSpeaking();
            $(this).removeClass('speaking');
        } else {
            if (typeof SyllableGameLogic !== 'undefined') {
                SyllableGameLogic.speakCurrentSyllable();
            }
        }
    });

    $('#nextSyllableBtn').click(function() {
        if (typeof SyllableGameLogic !== 'undefined') {
            SyllableGameLogic.nextSyllable();
        }
    });

    $('#repeatQuestionBtn').click(function() {
        if (typeof SyllableGameLogic !== 'undefined') {
            SyllableGameLogic.speakCurrentQuestion();
        }
    });

    $('#option1, #option2, #option3, #option4').click(function() {
        if ($(this).hasClass('disabled')) return;
        if (typeof SyllableGameLogic === 'undefined') return;

        const selectedSyllable = $(this).text();
        SyllableGameLogic.selectOption(selectedSyllable);
    });

    $('#voiceToggleBtn').click(function() {
        if (typeof SyllableVoiceService === 'undefined' || typeof SyllableGameState === 'undefined') return;

        const newState = SyllableVoiceService.toggleVoice();
        SyllableGameState.update('voiceEnabled', newState);

        if (!newState) {
            SyllableVoiceService.stopSpeaking();
        }

        updateVoiceButtons();

        if (typeof UIManager !== 'undefined') {
            UIManager.showMessage(
                newState ? 'Озвучка включена' : 'Озвучка выключена',
                newState ? '#4caf50' : '#f44336'
            );
        }
    });

    $('#autoVoiceToggleBtn').click(function() {
        if (typeof SyllableVoiceService === 'undefined' || typeof SyllableGameState === 'undefined') return;

        const newState = SyllableVoiceService.toggleAutoVoice();
        SyllableGameState.update('autoVoice', newState);

        updateVoiceButtons();

        if (typeof UIManager !== 'undefined') {
            UIManager.showMessage(
                newState ? 'Автоозвучка включена' : 'Автоозвучка выключена',
                newState ? '#4caf50' : '#ff9800'
            );
        }

        if (newState && SyllableGameState.getProp('currentMode') === 'testing' &&
            typeof SyllableGameLogic !== 'undefined') {
            setTimeout(() => SyllableGameLogic.speakCurrentQuestion(), 300);
        }
    });

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

        if (typeof UIManager !== 'undefined') {
            UIManager.showMessage('Игра начинается сначала!', '#ffd700');
        }

        if (typeof SyllableVoiceService !== 'undefined') {
            SyllableVoiceService.stopSpeaking();
            SyllableVoiceService.resetCounters();
        }

        if (typeof SyllableCharacterManager !== 'undefined') {
            SyllableCharacterManager.resetHistory();
        }

        if (typeof SyllableGameState !== 'undefined') {
            SyllableGameState.resetGame();
        }

        updateVoiceButtons();

        if (typeof SyllableGameLogic !== 'undefined') {
            SyllableGameLogic.init();
        }
    });

    $(window).on('blur', function() {
        if (typeof SyllableVoiceService !== 'undefined') {
            SyllableVoiceService.stopSpeaking();
        }
    });
});