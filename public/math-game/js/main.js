// ========== ГЛАВНЫЙ ФАЙЛ МАТЕМАТИЧЕСКОЙ ИГРЫ ==========
$(document).ready(function() {
    console.log('Main.js started');

    // Даем время на инициализацию всех сервисов
    setTimeout(() => {
        checkRequiredServices();
    }, 100);

    // Проверяем наличие всех необходимых сервисов
    function checkRequiredServices() {
        const required = ['GameState', 'HouseManager', 'UIManager', 'CharacterManager'];
        const missing = required.filter(service => typeof window[service] === 'undefined');

        if (missing.length > 0) {
            console.warn('Missing services:', missing);
        } else {
            console.log('All required services loaded');
        }
    }

    // Проверяем, какой браузер используется
    const isYandexBrowser = /YaBrowser/i.test(navigator.userAgent);

    if (isYandexBrowser) {
        console.log('🎉 Яндекс.Браузер detected! Using built-in Alice');
    }

    // Загрузка ресурсов
    if (typeof ResourceManager === 'undefined') {
        console.error('ResourceManager not found!');
        $('#loadingStatus').text('Ошибка загрузки ресурсов');
        return;
    }

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
        console.log('Starting game...');

        // Инициализация UI
        if (typeof UIManager !== 'undefined') {
            UIManager.init();
        }

        // Инициализация игровой логики
        if (typeof GameLogic !== 'undefined') {
            GameLogic.init();
        } else {
            console.error('GameLogic not available');
        }

        $('#gameWrapper').css('opacity', '1');

        // Запуск таймера случайных персонажей
        if (typeof SyllableCharacterManager !== 'undefined') {
            SyllableCharacterManager.startRandomTimer();
        }

        // Проверяем поддержку озвучки
        const voiceSupported = typeof MathVoiceService !== 'undefined' &&
            MathVoiceService.isSupported &&
            MathVoiceService.isSupported();

        if (!voiceSupported) {
            console.log('No speech support');
            $('#speakButton').hide();
            $('#voiceToggleBtn').hide();
            $('#autoVoiceToggleBtn').hide();
        } else {
            // Показываем информацию об используемом голосе
            const browserInfo = MathVoiceService.getBrowserInfo ?
                MathVoiceService.getBrowserInfo() : { isYandexBrowser: false, hasYandexSpeaker: false };

            if (browserInfo.isYandexBrowser && browserInfo.hasYandexSpeaker) {
                if (typeof UIManager !== 'undefined') {
                    UIManager.showMessage('Алиса готова помогать! 🎤', '#4caf50');
                }
                $('#voiceIcon').text('🎤');
            }

            updateVoiceButtons();
        }

        // Подписываемся на изменения состояния
        if (typeof GameState !== 'undefined') {
            GameState.subscribe((state) => {
                updateVoiceButtons();
            });
        }
    }

    // Обновление состояния кнопок озвучки
    function updateVoiceButtons() {
        if (typeof GameState === 'undefined') return;

        const state = GameState.get();
        const browserInfo = typeof MathVoiceService !== 'undefined' &&
        MathVoiceService.getBrowserInfo ?
            MathVoiceService.getBrowserInfo() :
            { isYandexBrowser: false, hasYandexSpeaker: false };

        // Кнопка вкл/выкл озвучки
        if (state.voiceEnabled) {
            $('#voiceToggleBtn').removeClass('disabled');
            if (browserInfo.isYandexBrowser && browserInfo.hasYandexSpeaker) {
                $('#voiceIcon').text('🎤');
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
        if (typeof GameState === 'undefined' || typeof GameLogic === 'undefined') return;
        if (GameState.getProp('currentLevel') === 0) return;

        const selectedValue = parseInt($(this).text());
        GameLogic.selectOption(selectedValue);
    });

    $('#speakButton').click(function() {
        if (typeof MathVoiceService === 'undefined') {
            console.log('Voice service not available');
            return;
        }

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
        if (typeof MathVoiceService === 'undefined' || typeof GameState === 'undefined') return;

        const newState = MathVoiceService.toggleVoice();
        GameState.update('voiceEnabled', newState);

        if (!newState) {
            MathVoiceService.stopSpeaking();
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
        if (typeof MathVoiceService === 'undefined' || typeof GameState === 'undefined') return;

        const newState = MathVoiceService.toggleAutoVoice();
        GameState.update('autoVoice', newState);

        updateVoiceButtons();
        if (typeof UIManager !== 'undefined') {
            UIManager.showMessage(
                newState ? 'Автоозвучка включена' : 'Автоозвучка выключена',
                newState ? '#4caf50' : '#ff9800'
            );
        }

        if (newState && GameState.getProp('currentLevel') > 0 && typeof GameLogic !== 'undefined') {
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

        if (typeof UIManager !== 'undefined') {
            UIManager.showMessage('Игра начинается сначала!', '#ffd700');
        }

        if (typeof MathVoiceService !== 'undefined') {
            MathVoiceService.stopSpeaking();
            MathVoiceService.resetCounters();
        }

        if (typeof GameState !== 'undefined') {
            GameState.resetGame();
        }

        if (typeof SyllableCharacterManager !== 'undefined') {
            SyllableCharacterManager.resetHistory();
        }

        updateVoiceButtons();

        if (typeof GameLogic !== 'undefined') {
            GameLogic.loadNumber(2);
        }
    });

    $('#resetModal').click(function(e) {
        if ($(e.target).is('#resetModal')) {
            $(this).fadeOut(200);
        }
    });

    // Обработка переключения вкладок/страниц
    $(window).on('blur', function() {
        if (typeof MathVoiceService !== 'undefined') {
            MathVoiceService.stopSpeaking();
        }
    });

    // Очистка при выгрузке страницы
    $(window).on('beforeunload', function() {
        if (typeof DragDropManager !== 'undefined' && DragDropManager.destroy) {
            DragDropManager.destroy();
        }
        if (typeof MathVoiceService !== 'undefined') {
            MathVoiceService.stopSpeaking();
        }
    });
});