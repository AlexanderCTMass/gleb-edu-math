const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========== НАСТРОЙКИ ==========

// Раздача статических файлов (фронтенд)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware для парсинга JSON
app.use(express.json());

// CORS настройки (для безопасности указываем конкретные источники)
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://84.201.157.119:3000',
    'https://84.201.157.119:3000',
    'http://math-game-frontend.website.yandexcloud.net',
    'https://math-game-frontend.website.yandexcloud.net'
];

app.use(cors({
    origin: function(origin, callback) {
        // Разрешаем запросы без origin (например, с Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'CORS policy violation';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ========== API ЭНДПОИНТЫ ==========

// Проверка работоспособности сервера
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        yandexConfigured: !!(process.env.YANDEX_API_KEY && process.env.YANDEX_FOLDER_ID)
    });
});

// Эндпоинт для получения конфигурации (без ключей!)
app.get('/api/config', (req, res) => {
    res.json({
        yandexAvailable: !!(process.env.YANDEX_API_KEY && process.env.YANDEX_FOLDER_ID)
    });
});

// Эндпоинт для озвучки через Яндекс.Облако
app.post('/api/tts', async (req, res) => {
    try {
        const { text, voice = 'alena', emotion = 'good', speed = 1.0 } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (!process.env.YANDEX_API_KEY || !process.env.YANDEX_FOLDER_ID) {
            return res.status(500).json({ error: 'Yandex API not configured on server' });
        }

        console.log(`[TTS] Request: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

        const formData = new FormData();
        formData.append('text', text);
        formData.append('lang', 'ru-RU');
        formData.append('voice', voice);
        formData.append('emotion', emotion);
        formData.append('speed', speed.toString());
        formData.append('format', 'oggopus');

        const response = await axios({
            method: 'POST',
            url: 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize',
            headers: {
                'Authorization': `Api-Key ${process.env.YANDEX_API_KEY}`,
                'x-folder-id': process.env.YANDEX_FOLDER_ID,
                ...formData.getHeaders()
            },
            data: formData,
            responseType: 'arraybuffer',
            timeout: 30000 // 30 секунд таймаут
        });

        // Конвертируем в base64 для отправки клиенту
        const audioBase64 = Buffer.from(response.data).toString('base64');

        console.log(`[TTS] Success, audio size: ${(response.data.length / 1024).toFixed(2)} KB`);

        res.json({
            success: true,
            audio: audioBase64,
            format: 'ogg',
            size: response.data.length
        });

    } catch (error) {
        console.error('[TTS Error]', error.message);

        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data?.toString());
        }

        res.status(500).json({
            error: 'TTS failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Эндпоинт для предзагрузки популярных фраз
app.post('/api/preload', async (req, res) => {
    try {
        const { phrases } = req.body;

        if (!phrases || !Array.isArray(phrases)) {
            return res.status(400).json({ error: 'Phrases array required' });
        }

        res.json({
            success: true,
            count: phrases.length,
            message: 'Preload request accepted'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ОБРАБОТКА МАРШРУТОВ ФРОНТЕНДА ==========

// Для SPA (Single Page Application) - все неизвестные маршруты отдаем index.html
app.get('*', (req, res, next) => {
    // Если запрос начинается с /api, пропускаем дальше (вернет 404)
    if (req.path.startsWith('/api')) {
        return next();
    }

    // Проверяем, существует ли запрошенный файл
    const filePath = path.join(__dirname, 'public', req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
    }

    // Иначе отдаем index.html для клиентской маршрутизации
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== ЗАПУСК СЕРВЕРА ==========

// Функция для запуска сервера (HTTP или HTTPS)
function startServer(useHttps = false) {
    let server;

    if (useHttps) {
        try {
            // Пытаемся загрузить SSL сертификаты
            const options = {
                key: fs.readFileSync('/opt/math-game/key.pem'),
                cert: fs.readFileSync('/opt/math-game/cert.pem')
            };
            server = https.createServer(options, app);
            console.log('✅ HTTPS certificates loaded successfully');
        } catch (error) {
            console.log('❌ Failed to load HTTPS certificates:', error.message);
            console.log('⚠️  Falling back to HTTP server');
            server = app;
        }
    } else {
        server = app;
    }

    server.listen(PORT, () => {
        console.log('\n' + '='.repeat(50));
        console.log(`🚀 Server is running!`);
        console.log(`📡 Protocol: ${useHttps ? 'HTTPS' : 'HTTP'}`);
        console.log(`🌎 Port: ${PORT}`);
        console.log(`📁 Static files: ${path.join(__dirname, 'public')}`);
        console.log(`🔧 Yandex API: ${process.env.YANDEX_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
        console.log(`📂 Yandex Folder: ${process.env.YANDEX_FOLDER_ID ? '✅ Configured' : '❌ Not configured'}`);
        console.log(`🌐 Frontend URL: http${useHttps ? 's' : ''}://84.201.157.119:${PORT}`);
        console.log('='.repeat(50) + '\n');
    });
}

// Определяем, использовать ли HTTPS (проверяем наличие сертификатов)
const useHttps = fs.existsSync('/opt/math-game/key.pem') && fs.existsSync('/opt/math-game/cert.pem');
startServer(useHttps);