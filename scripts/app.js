document.addEventListener('DOMContentLoaded', () => {
    fetchWeatherData();

    const footprintForm = document.getElementById('footprintForm');
    footprintForm.addEventListener('submit', calculateFootprint);
});

function fetchWeatherData() {
    const apiKey = '0f7e694f46msh3881d419eee8509p1b7ff0jsncb198043824e'; // Your API key

    const city = 'London';  // You can change this to get data based on user input

    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            const weatherDataDiv = document.getElementById('weatherData');
            weatherDataDiv.innerHTML = `
                <p>City: ${data.name}</p>
                <p>Temperature: ${(data.main.temp - 273.15).toFixed(2)} °C</p>
                <p>Weather: ${data.weather[0].description}</p>
            `;
        })
        .catch(error => console.error('Error fetching weather data:', error));
}

function calculateFootprint(event) {
    event.preventDefault();

    const activity = document.getElementById('activity').value;
    const apiKey = 'YOUR_CARBON_FOOTPRINT_API_KEY'; // Replace with actual API key

    fetch(`https://api.carbonfootprint.com/calculate?activity=${activity}&apikey=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            const footprintResultDiv = document.getElementById('footprintResult');
            footprintResultDiv.innerHTML = `
                <p>Carbon Footprint: ${data.footprint} kg CO2</p>
            `;
        })
        .catch(error => console.error('Error calculating carbon footprint:', error));
}
