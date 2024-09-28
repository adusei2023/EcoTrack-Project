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
    const vehicleModelId = document.getElementById('vehicleModelId').value; 
    const distance = document.getElementById('distance').value; 
    const footprintResultDiv = document.getElementById('footprintResult');

    // Clear previous result
    footprintResultDiv.innerHTML = '';

    if (!vehicleModelId || !distance) {
        alert('Please enter both vehicle model ID and distance.');
        return;
    }

    if (isNaN(distance) || distance <= 0) {
        alert('Please enter a valid distance.');
        return;
    }

    footprintResultDiv.innerHTML = '<p>Calculating...</p>'; // Show a loader

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

        // Update the UI with the result
        footprintResultDiv.innerHTML = `
            <p>Activity: ${activity}</p>
            <p>Carbon Footprint: ${carbonFootprint.toFixed(4)} metric tons CO2</p>
        `;
    } catch (error) {
        // Log the full error for debugging
        console.error('Error calculating carbon footprint:', error);

        // Display a user-friendly message
        footprintResultDiv.innerHTML = `<p>Error calculating carbon footprint: ${error.message}. Please try again later.</p>`;
    }
}
