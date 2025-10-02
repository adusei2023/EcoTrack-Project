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
    const weatherDataDiv = document.getElementById('weatherData');
    
    // Show loading state
    weatherDataDiv.innerHTML = '<div class="loading">Loading weather data...</div>';
    
    try {
        const apiKey = 'f2876b99e4f6974069b2022cad36d2ec'; // OpenWeather API key
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`);
        const data = await response.json();

        if (data.cod === '404') {
            throw new Error('City not found');
        }

        const tempCelsius = (data.main.temp - 273.15).toFixed(1);
        const feelsLike = (data.main.feels_like - 273.15).toFixed(1);
        
        weatherDataDiv.innerHTML = `
            <div class="success">
                <h3 style="margin-top: 0;">📍 ${data.name}, ${data.sys.country}</h3>
                <p><strong>Temperature:</strong> ${tempCelsius} °C</p>
                <p><strong>Feels Like:</strong> ${feelsLike} °C</p>
                <p><strong>Weather:</strong> ${data.weather[0].description}</p>
                <p><strong>Humidity:</strong> ${data.main.humidity}%</p>
                <p><strong>Wind Speed:</strong> ${data.wind.speed} m/s</p>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        weatherDataDiv.innerHTML = `
            <div class="error">
                <strong>Error:</strong> ${error.message === 'City not found' ? 'City not found. Please check the spelling and try again.' : 'Unable to fetch weather data. Please try again later.'}
            </div>
        `;
    }
}

// Calculate carbon footprint using Carbon Interface API
async function calculateFootprint() {
    const activity = document.getElementById('activity').value;
    const vehicleModelId = document.getElementById('vehicleModelId').value; 
    const distance = document.getElementById('distance').value; 
    const footprintResultDiv = document.getElementById('footprintResult');

    // Clear previous result
    footprintResultDiv.innerHTML = '';

    if (!vehicleModelId || !distance) {
        footprintResultDiv.innerHTML = '<div class="error">Please enter both vehicle model ID and distance.</div>';
        return;
    }

    if (isNaN(distance) || distance <= 0) {
        footprintResultDiv.innerHTML = '<div class="error">Please enter a valid distance greater than 0.</div>';
        return;
    }

    footprintResultDiv.innerHTML = '<div class="loading">Calculating your carbon footprint...</div>';

    try {
        // Make API request to Carbon Interface
        const response = await fetch('https://www.carboninterface.com/api/v1/estimates', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer 8NFZX89XCH3W5CFRKJKBT1S894`, // API Key
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'vehicle',
                vehicle_model_id: vehicleModelId,
                distance_unit: 'km',
                distance_value: distance
            })
        });

        // Check for API errors (unauthorized, server error, etc.)
        if (!response.ok) {
            throw new Error(`Error fetching carbon footprint data: ${response.status} ${response.statusText}`);
        }

        // Parse the JSON response
        const data = await response.json();

        // Log full response for debugging purposes
        console.log("Full API Response:", data);

        // Ensure the data has the expected structure
        if (!data.data || !data.data.attributes || typeof data.data.attributes.carbon_mt === 'undefined') {
            throw new Error('Invalid data structure received from API.');
        }

        const carbonFootprint = data.data.attributes.carbon_mt;
        const carbonKg = (carbonFootprint * 1000).toFixed(2);

        // Update the UI with the result
        footprintResultDiv.innerHTML = `
            <div class="success">
                <h3 style="margin-top: 0;">🌱 Carbon Footprint Result</h3>
                <p><strong>Activity:</strong> ${activity}</p>
                <p><strong>Distance:</strong> ${distance} km</p>
                <p><strong>Carbon Emissions:</strong> ${carbonFootprint.toFixed(4)} metric tons CO2</p>
                <p><strong>Equivalent:</strong> ${carbonKg} kg CO2</p>
                <p style="margin-top: 15px; font-style: italic; color: #666;">💡 Tip: Consider carpooling, using public transport, or switching to electric vehicles to reduce your carbon footprint!</p>
            </div>
        `;
    } catch (error) {
        // Log the full error for debugging
        console.error('Error calculating carbon footprint:', error);

        // Display a user-friendly message
        footprintResultDiv.innerHTML = `
            <div class="error">
                <strong>Error:</strong> ${error.message}
                <p style="margin-top: 10px;">Please verify your vehicle model ID and try again.</p>
            </div>
        `;
    }
}
