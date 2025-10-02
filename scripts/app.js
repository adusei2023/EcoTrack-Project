document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode
    initializeDarkMode();

    // Load and display history
    displayHistory();

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

    // Handle clear history button
    const clearHistoryBtn = document.getElementById('clearHistory');
    clearHistoryBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all history?')) {
            localStorage.removeItem('carbonFootprintHistory');
            displayHistory();
        }
    });

    // Handle dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    darkModeToggle.addEventListener('click', toggleDarkMode);
});

// Dark Mode Functions
function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').textContent = '☀️';
    }
}

function toggleDarkMode() {
    const body = document.body;
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    
    localStorage.setItem('darkMode', isDarkMode);
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
}

// History Management Functions
function saveToHistory(data) {
    let history = JSON.parse(localStorage.getItem('carbonFootprintHistory') || '[]');
    
    const entry = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        activity: data.activity,
        distance: data.distance,
        carbonMt: data.carbonMt,
        carbonKg: data.carbonKg,
        treesNeeded: calculateTreesNeeded(data.carbonMt),
        daysOfElectricity: calculateElectricityDays(data.carbonMt)
    };
    
    history.unshift(entry); // Add to beginning
    
    // Keep only last 10 entries
    if (history.length > 10) {
        history = history.slice(0, 10);
    }
    
    localStorage.setItem('carbonFootprintHistory', JSON.stringify(history));
    displayHistory();
}

function displayHistory() {
    const history = JSON.parse(localStorage.getItem('carbonFootprintHistory') || '[]');
    const historyList = document.getElementById('historyList');
    const clearBtn = document.getElementById('clearHistory');
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No calculations yet. Start tracking your carbon footprint above!</p>';
        clearBtn.style.display = 'none';
        return;
    }
    
    clearBtn.style.display = 'block';
    
    historyList.innerHTML = history.map(entry => `
        <div class="history-item">
            <div class="history-item-header">
                <strong>🌱 ${entry.activity}</strong>
                <span class="history-item-date">${entry.date}</span>
            </div>
            <div class="history-item-content">
                <p><strong>Distance:</strong> ${entry.distance} km</p>
                <p><strong>CO2 Emissions:</strong> ${entry.carbonKg} kg</p>
            </div>
            <div class="offset-info">
                🌳 <strong>Offset:</strong> Plant ${entry.treesNeeded} tree${entry.treesNeeded !== 1 ? 's' : ''} to offset this emission<br>
                💡 <strong>Equivalent:</strong> ${entry.daysOfElectricity} day${entry.daysOfElectricity !== 1 ? 's' : ''} of household electricity
            </div>
        </div>
    `).join('');
}

// Carbon Offset Calculation Functions
function calculateTreesNeeded(carbonMt) {
    // A tree absorbs approximately 21.77 kg (0.02177 metric tons) of CO2 per year
    const kgPerTree = 21.77;
    const carbonKg = carbonMt * 1000;
    return Math.ceil(carbonKg / kgPerTree);
}

function calculateElectricityDays(carbonMt) {
    // Average US household uses about 30 kWh per day, producing ~12.7 kg CO2
    const kgPerDay = 12.7;
    const carbonKg = carbonMt * 1000;
    return Math.round(carbonKg / kgPerDay);
}

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
        const treesNeeded = calculateTreesNeeded(carbonFootprint);
        const daysOfElectricity = calculateElectricityDays(carbonFootprint);

        // Save to history
        saveToHistory({
            activity: activity,
            distance: distance,
            carbonMt: carbonFootprint,
            carbonKg: carbonKg
        });

        // Update the UI with the result
        footprintResultDiv.innerHTML = `
            <div class="success">
                <h3 style="margin-top: 0;">🌱 Carbon Footprint Result</h3>
                <p><strong>Activity:</strong> ${activity}</p>
                <p><strong>Distance:</strong> ${distance} km</p>
                <p><strong>Carbon Emissions:</strong> ${carbonFootprint.toFixed(4)} metric tons CO2</p>
                <p><strong>Equivalent:</strong> ${carbonKg} kg CO2</p>
                <div style="margin-top: 15px; padding: 15px; background-color: rgba(76, 175, 80, 0.1); border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #2e7d32;">🌳 Carbon Offset Options:</h4>
                    <p style="margin: 5px 0;">• Plant <strong>${treesNeeded}</strong> tree${treesNeeded !== 1 ? 's' : ''} to offset this emission</p>
                    <p style="margin: 5px 0;">• This is equivalent to <strong>${daysOfElectricity}</strong> day${daysOfElectricity !== 1 ? 's' : ''} of household electricity</p>
                </div>
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
