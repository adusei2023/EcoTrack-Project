document.addEventListener('DOMContentLoaded', function() {
    // Handle weather form submission
    const weatherForm = document.getElementById('weatherForm');
    weatherForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const city = document.getElementById('city').value;
        await fetchWeatherData(city);
    });

    // Handle footprint form submission
    const footprintForm = document.getElementById('footprintForm');
    footprintForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        await calculateFootprint();
    });
});

// Fetch weather data based on user input
async function fetchWeatherData(city) {
    try {
        const apiKey = 'f2876b99e4f6974069b2022cad36d2ec'; // OpenWeather API key
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`);
        const data = await response.json();

        if (data.cod === '404') {
            throw new Error('City not found');
        }

        const weatherDataDiv = document.getElementById('weatherData');
        weatherDataDiv.innerHTML = `
            <p>City: ${data.name}</p>
            <p>Temperature: ${(data.main.temp - 273.15).toFixed(2)} °C</p>
            <p>Weather: ${data.weather[0].description}</p>
        `;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        const weatherDataDiv = document.getElementById('weatherData');
        weatherDataDiv.innerHTML = 'Error fetching weather data. Please try again later.';
    }
}

// Calculate carbon footprint using Carbon Interface API
async function calculateFootprint() {
    const activity = document.getElementById('activity').value;
    const apiKey = 'O94TX4nPqEUULOxTMmDqQ'; // Your Carbon Interface API key
    const vehicleModelId = 'PUT_VEHICLE_MODEL_ID_HERE'; // Replace with valid vehicle model ID from the first step
    const distance = 100; // Example distance (you can make this dynamic)

    try {
        const response = await fetch('https://www.carboninterface.com/api/v1/estimates', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'vehicle',
                vehicle_model_id: vehicleModelId,
                distance_unit: 'km',
                distance_value: distance
            })
        });

        if (!response.ok) {
            throw new Error('Error fetching carbon footprint data');
        }

        const data = await response.json();

        const footprintResultDiv = document.getElementById('footprintResult');
        footprintResultDiv.innerHTML = `
            <p>Activity: ${activity}</p>
            <p>Carbon Footprint: ${data.data.attributes.carbon_mt} metric tons CO2</p>
        `;
    } catch (error) {
        console.error('Error calculating carbon footprint:', error);
        const footprintResultDiv = document.getElementById('footprintResult');
        footprintResultDiv.innerHTML = 'Error calculating carbon footprint. Please try again later.';
    }
}
