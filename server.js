const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Если хотите раздавать статику

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
            return res.status(500).json({ error: 'Yandex API not configured' });
        }

        console.log(`TTS request: "${text.substring(0, 50)}..."`);

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
            responseType: 'arraybuffer'
        });

        // Конвертируем в base64 для отправки клиенту
        const audioBase64 = Buffer.from(response.data).toString('base64');

        res.json({
            success: true,
            audio: audioBase64,
            format: 'ogg'
        });

    } catch (error) {
        console.error('Yandex TTS API error:', error.response?.data || error.message);

        res.status(500).json({
            error: 'TTS failed',
            details: error.message
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

        // Здесь можно реализовать кэширование на сервере
        // Например, сохранять в Redis или файловую систему

        res.json({
            success: true,
            count: phrases.length,
            message: 'Preload request accepted'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Yandex API configured: ${!!(process.env.YANDEX_API_KEY && process.env.YANDEX_FOLDER_ID)}`);
});