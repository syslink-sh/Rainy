const axios = require('axios');

exports.getHealth = (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
};

exports.getWeather = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and Longitude are required' });
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey || apiKey === 'your_openweather_api_key_here') {
             return res.status(500).json({ error: 'Server configuration error: API Key missing' });
        }

        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

        const response = await axios.get(url);
        res.json(response.data);

    } catch (error) {
        console.error('Error fetching weather data:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Failed to fetch weather data' });
        }
    }
};
