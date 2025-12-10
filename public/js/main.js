document.addEventListener('DOMContentLoaded', () => {
    const weatherContainer = document.getElementById('weather-container');
    const errorMessage = document.getElementById('error-message');
    const refreshBtn = document.getElementById('refresh-btn');

    const fetchWeather = async (lat, lon) => {
        try {
            weatherContainer.innerHTML = '<div class="loading"><p>Fetching weather data...</p></div>';
            errorMessage.style.display = 'none';

            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            renderWeather(data);
        } catch (error) {
            console.error('Error fetching weather:', error);
            showError(error.message);
        }
    };

    const renderWeather = (data) => {
        const temp = Math.round(data.main.temp);
        const description = data.weather[0].description;
        const humidity = data.main.humidity;
        const windSpeed = data.wind.speed;
        const city = data.name;

        weatherContainer.innerHTML = `
            <div class="location-name">
                <h3>${city}</h3>
            </div>
            <div class="temp-display">
                ${temp}°C
            </div>
            <p class="description">${description}</p>
            <div class="details">
                <span>Humidity: ${humidity}%</span>
                <span>Wind: ${windSpeed} m/s</span>
            </div>
        `;
    };

    const showError = (message) => {
        weatherContainer.innerHTML = '';
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    };

    const getLocation = () => {
        if (navigator.geolocation) {
            weatherContainer.innerHTML = '<div class="loading"><p>Acquiring location...</p></div>';
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    fetchWeather(latitude, longitude);
                },
                (error) => {
                    let msg = 'Error getting location.';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            msg = "User denied the request for Geolocation.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            msg = "Location information is unavailable.";
                            break;
                        case error.TIMEOUT:
                            msg = "The request to get user location timed out.";
                            break;
                        case error.UNKNOWN_ERROR:
                            msg = "An unknown error occurred.";
                            break;
                    }
                    showError(msg);
                }
            );
        } else {
            showError("Geolocation is not supported by this browser.");
        }
    };

    // Initial load
    getLocation();

    // Refresh button
    refreshBtn.addEventListener('click', getLocation);
});
