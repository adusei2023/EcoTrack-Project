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

    // Handle AI chat form submission
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const chatInput = document.getElementById('chatInput');
            const message = chatInput.value.trim();
            if (message) {
                await sendChatMessage(message);
                chatInput.value = '';
            }
        });
    }

    // Handle voice input button
    const voiceButton = document.getElementById('voiceButton');
    if (voiceButton) {
        voiceButton.addEventListener('click', startVoiceInput);
    }

    // Generate AI insights on page load if history exists
    generateAIInsights();
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
    generateAIInsights(); // Update AI insights with new data
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

// AI Assistant Functions
async function sendChatMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    
    // Add user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chat-message user-message';
    userMessageDiv.innerHTML = `
        <span class="message-icon">👤</span>
        <div class="message-content">
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    chatMessages.appendChild(userMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot-message typing';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <span class="message-icon">🤖</span>
        <div class="message-content">
            <p class="typing-animation">Thinking...</p>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // Get AI response
        const response = await getAIResponse(message);
        
        // Remove typing indicator
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }

        // Add bot message
        const botMessageDiv = document.createElement('div');
        botMessageDiv.className = 'chat-message bot-message';
        botMessageDiv.innerHTML = `
            <span class="message-icon">🤖</span>
            <div class="message-content">
                <p>${response}</p>
            </div>
        `;
        chatMessages.appendChild(botMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Error getting AI response:', error);
        
        // Remove typing indicator
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }

        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-message bot-message';
        errorDiv.innerHTML = `
            <span class="message-icon">🤖</span>
            <div class="message-content">
                <p>I apologize, but I'm having trouble processing your request. Please try again.</p>
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// AI Response Generator (Local AI logic)
async function getAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Get user's history for context
    const history = JSON.parse(localStorage.getItem('carbonFootprintHistory') || '[]');
    const totalEmissions = history.reduce((sum, entry) => sum + parseFloat(entry.carbonKg || 0), 0);
    const avgEmissions = history.length > 0 ? (totalEmissions / history.length).toFixed(2) : 0;

    // Pattern matching for different types of questions
    if (lowerMessage.includes('carbon footprint') || lowerMessage.includes('emissions')) {
        if (history.length > 0) {
            return `Based on your tracking history, you've recorded ${history.length} activities with a total of ${totalEmissions.toFixed(2)} kg of CO2 emissions. Your average per activity is ${avgEmissions} kg. ${getPersonalizedTip(avgEmissions)}`;
        } else {
            return "You haven't tracked any activities yet. Start by using the Carbon Footprint Calculator above to understand your emissions. The average person generates about 4 tons of CO2 per year from transportation alone.";
        }
    }
    
    if (lowerMessage.includes('reduce') || lowerMessage.includes('lower') || lowerMessage.includes('decrease')) {
        return `Here are AI-powered recommendations to reduce your carbon footprint:\n\n✅ Switch to public transportation or carpooling - can reduce emissions by 2.5 tons/year\n✅ Use energy-efficient appliances - saves 30-50% on energy\n✅ Adopt a plant-based diet - can save 0.8 tons CO2/year\n✅ Install smart home devices to optimize energy use\n✅ Choose renewable energy sources when available\n\nWould you like specific tips for any of these areas?`;
    }
    
    if (lowerMessage.includes('tree') || lowerMessage.includes('plant')) {
        if (totalEmissions > 0) {
            const treesNeeded = calculateTreesNeeded(totalEmissions / 1000);
            return `Based on your current emissions of ${totalEmissions.toFixed(2)} kg CO2, you would need to plant approximately ${treesNeeded} trees to offset your tracked activities. Each tree absorbs about 21.77 kg of CO2 per year. Consider supporting reforestation projects or planting native species in your area!`;
        }
        return "Trees are amazing carbon sinks! A single mature tree can absorb about 21.77 kg (48 lbs) of CO2 per year. Planting trees is one of the most effective ways to combat climate change. Would you like recommendations on which trees to plant in your region?";
    }
    
    if (lowerMessage.includes('climate change') || lowerMessage.includes('global warming')) {
        return "Climate change is the long-term shift in global temperatures and weather patterns, primarily caused by human activities that increase greenhouse gases. Key facts:\n\n🌡️ Global temperatures have risen 1.1°C since pre-industrial times\n🌊 Sea levels are rising 3.3mm per year\n🔥 Extreme weather events are becoming more frequent\n\nThe good news: Individual actions matter! Every ton of CO2 we prevent contributes to fighting climate change. What specific aspect would you like to know more about?";
    }
    
    if (lowerMessage.includes('electric') || lowerMessage.includes('ev') || lowerMessage.includes('vehicle')) {
        return "Electric vehicles (EVs) are a great choice for reducing carbon emissions! 🚗⚡\n\nKey benefits:\n• 50-70% lower emissions than gas vehicles\n• Lower operating costs (electricity vs. gasoline)\n• Reduced air pollution in cities\n• Quieter operation\n\nEven when accounting for electricity generation, EVs produce significantly less CO2 over their lifetime. If you charge with renewable energy, emissions can be near zero!";
    }
    
    if (lowerMessage.includes('recycle') || lowerMessage.includes('waste')) {
        return "Recycling and proper waste management are crucial for sustainability! ♻️\n\n💡 Smart tips:\n• Recycling 1 ton of paper saves 17 trees and 7,000 gallons of water\n• Composting reduces methane emissions from landfills\n• Recycling aluminum saves 95% of the energy needed to make new cans\n• Electronic waste recycling prevents toxic materials from polluting soil\n\nFollow the 5 R's: Refuse, Reduce, Reuse, Repurpose, Recycle (in that order!). Which area would you like specific guidance on?";
    }
    
    if (lowerMessage.includes('solar') || lowerMessage.includes('renewable') || lowerMessage.includes('energy')) {
        return "Renewable energy is the future of sustainable living! ☀️💨\n\n⚡ Benefits of switching to renewables:\n• Solar panels can reduce home emissions by 80%\n• Average payback period: 6-9 years\n• Increases property value\n• Many regions offer tax incentives\n\nEven if you can't install panels, many utilities offer green energy programs. Every kWh from renewable sources prevents ~0.5 kg of CO2. Interested in learning about specific renewable options?";
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        return "I'm your AI sustainability assistant! I can help you with:\n\n🌱 Understanding your carbon footprint\n📊 Analyzing your emission patterns\n💡 Personalized eco-tips based on your data\n🌍 Climate change information\n🚗 Transportation alternatives\n♻️ Recycling and waste reduction\n🌳 Carbon offsetting strategies\n⚡ Renewable energy options\n\nJust ask me anything about sustainability, and I'll provide AI-powered insights!";
    }
    
    if (lowerMessage.includes('food') || lowerMessage.includes('diet') || lowerMessage.includes('meat')) {
        return "Food choices have a significant impact on your carbon footprint! 🍽️\n\n📊 Carbon intensity by food type:\n• Beef: ~27 kg CO2 per kg\n• Lamb: ~39 kg CO2 per kg\n• Pork: ~12 kg CO2 per kg\n• Chicken: ~6 kg CO2 per kg\n• Plant-based: ~2 kg CO2 per kg\n\n🌱 Smart choices:\n• One plant-based meal per day saves 2.5 kg CO2\n• Buy local and seasonal produce\n• Reduce food waste (30% of food is wasted globally)\n• Choose organic when possible\n\nWould you like meal planning tips for lower emissions?";
    }
    
    // Default response with some intelligence
    return `That's a great question about sustainability! Based on your interest, I recommend:\n\n1. Start tracking your carbon footprint using the calculator above\n2. Check out our eco-friendly tips section\n3. Learn about climate change impacts on the Climate Info page\n\nCould you be more specific about what aspect of sustainability you'd like to explore? I can provide detailed insights on carbon footprints, renewable energy, waste reduction, sustainable transportation, and more!`;
}

// Generate AI-powered insights based on user history
function generateAIInsights() {
    const history = JSON.parse(localStorage.getItem('carbonFootprintHistory') || '[]');
    const insightsDiv = document.getElementById('aiInsightsContent');
    
    if (!insightsDiv) return;
    
    if (history.length === 0) {
        insightsDiv.innerHTML = '<p class="empty-state">Track your carbon footprint to get personalized AI insights and recommendations!</p>';
        return;
    }
    
    // Calculate statistics
    const totalEmissions = history.reduce((sum, entry) => sum + parseFloat(entry.carbonKg || 0), 0);
    const avgEmissions = (totalEmissions / history.length).toFixed(2);
    const totalDistance = history.reduce((sum, entry) => sum + parseFloat(entry.distance || 0), 0);
    const totalTrees = history.reduce((sum, entry) => sum + parseInt(entry.treesNeeded || 0), 0);
    
    // Generate personalized recommendations
    let insights = `
        <div class="ai-insight-card">
            <h3>📊 Your Emission Analysis</h3>
            <div class="insight-stats">
                <div class="stat-item">
                    <span class="stat-value">${history.length}</span>
                    <span class="stat-label">Activities Tracked</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${totalEmissions.toFixed(2)} kg</span>
                    <span class="stat-label">Total CO2 Emissions</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${avgEmissions} kg</span>
                    <span class="stat-label">Average per Activity</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${totalTrees}</span>
                    <span class="stat-label">Trees Needed</span>
                </div>
            </div>
        </div>
        
        <div class="ai-insight-card">
            <h3>🤖 AI Recommendations</h3>
            <div class="recommendations-list">
    `;
    
    // Generate smart recommendations based on emissions level
    if (avgEmissions > 50) {
        insights += `
            <div class="recommendation-item high-priority">
                <span class="rec-icon">🚨</span>
                <div class="rec-content">
                    <strong>High Priority:</strong> Your average emissions (${avgEmissions} kg) are above optimal levels. 
                    Consider switching to public transportation or carpooling to reduce by 40-60%.
                </div>
            </div>
        `;
    }
    
    if (totalDistance > 500) {
        insights += `
            <div class="recommendation-item">
                <span class="rec-icon">🚗</span>
                <div class="rec-content">
                    <strong>Smart Commute:</strong> You've traveled ${totalDistance.toFixed(0)} km. 
                    An electric vehicle could reduce your emissions by 70% for these trips.
                </div>
            </div>
        `;
    }
    
    insights += `
            <div class="recommendation-item">
                <span class="rec-icon">🌳</span>
                <div class="rec-content">
                    <strong>Carbon Offsetting:</strong> Plant ${totalTrees} trees or support reforestation projects 
                    to completely offset your tracked emissions.
                </div>
            </div>
            <div class="recommendation-item">
                <span class="rec-icon">💡</span>
                <div class="rec-content">
                    <strong>Optimization Tip:</strong> By reducing your per-trip distance by 20%, 
                    you could save ${(totalEmissions * 0.2).toFixed(2)} kg of CO2.
                </div>
            </div>
        </div>
    </div>
    
    <div class="ai-insight-card">
        <h3>📈 Trend Analysis</h3>
        <p>${getTrendAnalysis(history)}</p>
    </div>
    `;
    
    insightsDiv.innerHTML = insights;
}

// Analyze trends in user data
function getTrendAnalysis(history) {
    if (history.length < 2) {
        return "Keep tracking! I'll provide trend analysis once you have more data points.";
    }
    
    const recent = history.slice(0, Math.min(3, history.length));
    const older = history.slice(Math.min(3, history.length));
    
    if (older.length === 0) {
        return "You're off to a great start! Continue tracking to see how your habits evolve over time.";
    }
    
    const recentAvg = recent.reduce((sum, e) => sum + parseFloat(e.carbonKg), 0) / recent.length;
    const olderAvg = older.reduce((sum, e) => sum + parseFloat(e.carbonKg), 0) / older.length;
    const change = ((recentAvg - olderAvg) / olderAvg * 100).toFixed(1);
    
    if (Math.abs(change) < 5) {
        return "📊 Your emissions are stable. Great consistency! Consider implementing new strategies to reduce further.";
    } else if (change < 0) {
        return `📉 Excellent progress! Your recent activities show a ${Math.abs(change)}% decrease in emissions. Keep up the sustainable choices!`;
    } else {
        return `📈 Your recent emissions increased by ${change}%. Let's work on bringing those numbers down with smarter transportation choices!`;
    }
}

// Get personalized tip based on emission level
function getPersonalizedTip(avgEmissions) {
    if (avgEmissions > 50) {
        return "💡 AI Tip: Your emissions are higher than average. Consider public transport or carpooling for your next trip!";
    } else if (avgEmissions > 20) {
        return "💡 AI Tip: You're doing well! Try combining errands into one trip to reduce your footprint further.";
    } else {
        return "💡 AI Tip: Excellent work! You're a sustainability champion. Share your habits with others!";
    }
}

// Voice input functionality
function startVoiceInput() {
    const voiceButton = document.getElementById('voiceButton');
    const chatInput = document.getElementById('chatInput');
    
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        alert('Sorry, your browser does not support voice input. Please use Chrome, Edge, or Safari.');
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    voiceButton.textContent = '🔴';
    voiceButton.classList.add('recording');
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        voiceButton.textContent = '🎤';
        voiceButton.classList.remove('recording');
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        voiceButton.textContent = '🎤';
        voiceButton.classList.remove('recording');
        alert('Voice input error. Please try again.');
    };
    
    recognition.onend = function() {
        voiceButton.textContent = '🎤';
        voiceButton.classList.remove('recording');
    };
    
    recognition.start();
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

