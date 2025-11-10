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

// AI Response Generator (Enhanced with comprehensive climate change knowledge)
async function getAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Get user's history for context
    const history = JSON.parse(localStorage.getItem('carbonFootprintHistory') || '[]');
    const totalEmissions = history.reduce((sum, entry) => sum + parseFloat(entry.carbonKg || 0), 0);
    const avgEmissions = history.length > 0 ? (totalEmissions / history.length).toFixed(2) : 0;

    // Enhanced climate change topics - COMPREHENSIVE COVERAGE
    
    // Climate Change Fundamentals
    if (lowerMessage.includes('climate change') || lowerMessage.includes('global warming')) {
        if (lowerMessage.includes('cause') || lowerMessage.includes('why')) {
            return "Climate change is primarily caused by human activities that release greenhouse gases into the atmosphere. 🌍\n\n🔥 Main Causes:\n• Burning fossil fuels (coal, oil, gas) for energy - 75% of emissions\n• Deforestation - reduces CO2 absorption\n• Industrial processes - cement, steel production\n• Agriculture - methane from livestock, rice paddies\n• Waste management - landfills produce methane\n\n📊 Since 1850, human activities have released over 2,500 billion tons of CO2. The atmospheric CO2 concentration is now 420 ppm, highest in 3 million years!\n\nWant to learn about specific impacts or solutions?";
        }
        if (lowerMessage.includes('effect') || lowerMessage.includes('impact') || lowerMessage.includes('consequence')) {
            return "Climate change impacts every aspect of our planet and society. 🌡️\n\n🌊 Physical Impacts:\n• Rising temperatures: +1.1°C since 1850, heading toward 2-3°C\n• Sea level rise: 3.3mm/year, threatening 680 million coastal people\n• Ocean acidification: 30% increase since industrial revolution\n• Glacier melting: Lost 267 billion tons of ice per year\n• Extreme weather: 5x more heat waves, stronger hurricanes\n\n🌿 Ecosystem Impacts:\n• 1 million species at extinction risk\n• Coral bleaching: 50% of reefs damaged\n• Forest fires: 2x more frequent\n• Arctic ice: 13% decline per decade\n\n👥 Human Impacts:\n• Food security threats for 800M people\n• Water scarcity affecting 2 billion\n• Climate refugees: projected 200M by 2050\n• Economic losses: $280B annually\n\nWhich impact concerns you most?";
        }
        if (lowerMessage.includes('solution') || lowerMessage.includes('fix') || lowerMessage.includes('stop')) {
            return "We can still limit climate change! Here are proven solutions: 💪\n\n🎯 Global Solutions:\n• Transition to 100% renewable energy by 2050\n• Electrify transportation (EVs, trains, buses)\n• Protect and restore forests - 30% of solution\n• Develop carbon capture technology\n• Shift to sustainable agriculture\n• Implement carbon pricing\n\n👤 Individual Actions (most impactful):\n1. Reduce flying (1 transatlantic flight = 1.6 tons CO2)\n2. Switch to plant-based diet (saves 0.8 tons/year)\n3. Use renewable energy (saves 1.5 tons/year)\n4. Choose electric/public transport (saves 2.4 tons/year)\n5. Reduce consumption and waste\n\n⏰ We must cut emissions 45% by 2030 to limit warming to 1.5°C!\n\nReady to take action?";
        }
        return "Climate change is the long-term shift in global temperatures and weather patterns, primarily caused by human activities that increase greenhouse gases. 🌍\n\n📈 Key Facts:\n• Global temperatures: +1.1°C since pre-industrial times\n• Sea level rise: 3.3mm per year (accelerating)\n• Extreme weather: 5x more frequent heat waves\n• Arctic ice: Declining 13% per decade\n• CO2 levels: 420 ppm (highest in 3 million years)\n\n⚡ The good news: We have the technology and knowledge to solve this! Every action matters. Would you like to know more about causes, impacts, or solutions?";
    }
    
    // Greenhouse Gases Deep Dive
    if (lowerMessage.includes('greenhouse gas') || lowerMessage.includes('ghg') || lowerMessage.includes('co2') || lowerMessage.includes('methane')) {
        if (lowerMessage.includes('methane')) {
            return "Methane (CH4) is a super-potent greenhouse gas! 💨\n\n🔥 Key Facts:\n• 28-36x more powerful than CO2 over 100 years\n• 84x more powerful over 20 years\n• Stays in atmosphere for ~12 years (vs 100+ for CO2)\n• Responsible for 30% of current warming\n\n📍 Main Sources:\n• Agriculture: 40% (cattle, rice farming)\n• Fossil fuels: 35% (oil/gas leaks, coal mining)\n• Landfills: 16% (organic waste decomposition)\n• Wetlands: 9% (natural source)\n\n✅ Solutions:\n• Fix gas pipeline leaks\n• Better livestock management\n• Capture landfill gas\n• Reduce food waste\n• Alternative proteins\n\nReducing methane = fast climate benefits!";
        }
        return "Greenhouse gases trap heat in Earth's atmosphere, causing global warming. 🌡️\n\n🔬 Major Greenhouse Gases:\n• CO2 (Carbon dioxide): 76% of emissions, stays 100+ years\n• Methane (CH4): 16% of emissions, 28x more potent than CO2\n• Nitrous oxide (N2O): 6% of emissions, 265x more potent\n• F-gases: 2% of emissions, up to 23,000x more potent\n\n📊 CO2 Sources:\n• Energy: 73% (power, transport, manufacturing)\n• Agriculture: 18% (livestock, crops)\n• Industrial: 6% (cement, chemicals)\n• Waste: 3% (landfills)\n\n💡 Fun fact: Without any greenhouse gases, Earth would be -18°C (0°F)! The problem is too much of a good thing.\n\nWant to learn about specific gases or how to reduce them?";
    }
    
    // Paris Agreement and Climate Policy
    if (lowerMessage.includes('paris agreement') || lowerMessage.includes('paris accord') || lowerMessage.includes('cop') || lowerMessage.includes('climate policy')) {
        return "The Paris Agreement is the world's most important climate treaty! 🌍\n\n📜 Key Goals (adopted by 196 countries in 2015):\n• Limit warming to well below 2°C, ideally 1.5°C\n• Reach net-zero emissions by 2050\n• Review progress every 5 years\n• Support developing nations\n\n📊 Current Status:\n• We're on track for 2.4-2.8°C warming (not good enough!)\n• 70 countries committed to net-zero by 2050\n• $100B/year pledged to help developing nations\n\n🎯 COP Meetings:\n• COP28 (2023): First \"global stocktake\" - we're behind targets\n• Focus on tripling renewable energy by 2030\n• Phasing out fossil fuels\n\n⚡ What you can do: Support climate policies, vote for climate action, contact representatives!\n\nInterested in national climate policies?";
    }
    
    // Renewable Energy Deep Dive
    if (lowerMessage.includes('solar') || lowerMessage.includes('wind') || lowerMessage.includes('renewable') || lowerMessage.includes('clean energy')) {
        if (lowerMessage.includes('wind')) {
            return "Wind energy is one of the fastest-growing renewable sources! 💨\n\n⚡ Key Facts:\n• Wind turbines generate electricity with zero emissions\n• Can power a home for a day with 2 rotations\n• Wind energy capacity grew 75 GW in 2022 alone\n• Cost dropped 70% in last decade\n\n🌊 Types:\n• Onshore wind: Cheapest renewable ($30/MWh)\n• Offshore wind: More consistent, 3x potential\n• Floating offshore: Newest technology\n\n📊 Global Capacity:\n• 1,000 GW installed globally\n• Powers 100M+ homes\n• Could provide 10x global electricity needs\n\n♻️ Lifecycle emissions: 11g CO2/kWh (vs 820g for coal)\n\n🌱 Fun fact: One 2.5MW turbine prevents 4,000 tons CO2/year!\n\nInterested in installing a small wind turbine?";
        }
        return "Renewable energy is key to solving climate change! ☀️💨\n\n⚡ Major Sources:\n• Solar: 1,000 GW globally, fastest growing\n• Wind: 1,000 GW, most cost-effective\n• Hydro: 1,300 GW, largest renewable source\n• Geothermal: 16 GW, consistent baseload\n• Biomass: 140 GW, carbon-neutral potential\n\n📈 Amazing Progress:\n• Renewables = 29% of global electricity (2023)\n• Solar costs dropped 90% since 2010\n• Wind costs dropped 70% since 2010\n• EVs sales up 40% year-over-year\n\n🎯 2030 Goals:\n• Triple renewable capacity to 11,000 GW\n• Phase out unabated fossil fuels\n• 70% of new electricity from renewables\n\n💰 Economics:\n• Solar: $30-50/MWh (vs coal: $60-150/MWh)\n• Creating 12M jobs globally\n• $4.3 trillion invested in 2022\n\nReady to switch to green energy?";
    }
    
    // Tipping Points
    if (lowerMessage.includes('tipping point') || lowerMessage.includes('irreversible') || lowerMessage.includes('point of no return')) {
        return "Climate tipping points are critical thresholds that, once crossed, can trigger irreversible changes! ⚠️\n\n🚨 Major Tipping Points:\n• Amazon rainforest → Savanna (3-4°C): Losing carbon sink\n• Greenland ice sheet collapse (1.5-2°C): +7m sea rise\n• West Antarctic ice sheet (2°C): +3m sea rise\n• Atlantic current (AMOC) slowdown (2°C): Climate chaos\n• Arctic sea ice loss (2°C): Accelerated warming\n• Coral reef die-off (1.5°C): Ecosystem collapse\n• Permafrost thaw (2°C): Releases massive methane\n\n⏰ Current Status:\n• Already passed: Arctic summer ice\n• Approaching: Coral reefs (50% damaged)\n• Critical risk: Amazon (20% deforested)\n\n📊 Consequences:\n• Cascade effects - one triggers others\n• Self-reinforcing warming\n• Could add 1-2°C extra warming\n\n✅ Good news: Most tipping points avoidable under 1.5-2°C!\n\nLet's act now to stay safe!";
    }
    
    // Regional Climate Impacts
    if (lowerMessage.includes('region') || lowerMessage.includes('africa') || lowerMessage.includes('asia') || lowerMessage.includes('arctic') || lowerMessage.includes('pacific')) {
        if (lowerMessage.includes('arctic')) {
            return "The Arctic is warming 4x faster than the global average! 🧊\n\n❄️ Changes Happening:\n• Sea ice: -13% per decade since 1979\n• Summer could be ice-free by 2040\n• Permafrost thawing: Releases CO2 & methane\n• Glaciers melting: Greenland loses 280 billion tons/year\n\n🌡️ Impacts:\n• Polar bears losing habitat\n• Indigenous communities displaced\n• Albedo effect: Less ice = more heat absorption\n• Weather pattern disruption worldwide\n\n🔄 Feedback Loops:\n• Less ice → More dark ocean → More heat absorption → Less ice\n• Permafrost thaw → Methane release → More warming → More thaw\n\n⚠️ Global Consequences:\n• Jet stream changes = extreme weather everywhere\n• Greenland melt = 7m potential sea rise\n• Methane release = accelerated warming\n\nThe Arctic is our early warning system!";
        }
        return "Climate impacts vary significantly by region. 🌍\n\n🔥 Most Vulnerable Regions:\n• Small Island Nations: Sea level rise, storms (Maldives, Tuvalu)\n• Sub-Saharan Africa: Droughts, food insecurity (Ethiopia, Somalia)\n• South Asia: Floods, heat waves (Bangladesh, Pakistan)\n• Middle East: Water scarcity, extreme heat (Iraq, Yemen)\n• Arctic: Fastest warming, 4x global average\n\n📊 Regional Highlights:\n• Africa: 600M lack climate-resilient water (by 2050)\n• Asia: 1B affected by glacier melt (Himalayas)\n• Pacific Islands: 11 nations risk total submersion\n• Mediterranean: 40% rainfall decline projected\n• Amazon: 20-30% forest loss risk\n\n🌡️ Heat Records:\n• Middle East: 54°C in Kuwait (129°F)\n• Death Valley: 56.7°C hottest ever\n• European heat wave 2022: 70,000 deaths\n\nWhich region concerns you most?";
    }
    
    // Ocean and Climate
    if (lowerMessage.includes('ocean') || lowerMessage.includes('sea level') || lowerMessage.includes('acidification') || lowerMessage.includes('coral')) {
        if (lowerMessage.includes('acidification')) {
            return "Ocean acidification is climate change's 'evil twin'! 🌊\n\n🧪 The Science:\n• Oceans absorb 30% of human CO2 emissions\n• CO2 + water = carbonic acid\n• pH dropped 0.1 units (30% more acidic since 1800)\n• Fastest change in 66 million years\n\n🐚 Impacts:\n• Shellfish struggle to build shells\n• Coral reefs weakened and bleached\n• Disrupts marine food web\n• Affects 500M+ people dependent on fisheries\n\n📊 Species at Risk:\n• Pteropods (sea butterflies) - shells dissolve\n• Oysters, clams, mussels - reduced growth\n• Coral reefs - 50% already damaged\n• Commercial fisheries - $100B industry at risk\n\n✅ Solutions:\n• Reduce CO2 emissions (only real solution)\n• Protect marine ecosystems\n• Sustainable fishing practices\n• Support marine conservation\n\nHealthy oceans = healthy planet!";
        }
        return "Our oceans are critical climate regulators absorbing 90% of excess heat! 🌊\n\n🌡️ Ocean & Climate:\n• Absorb 30% of CO2 emissions (23 million tons/day!)\n• Store 50x more carbon than atmosphere\n• Regulate weather and climate patterns\n• Produce 50% of Earth's oxygen\n\n📈 Changes Happening:\n• Sea surface temp: +0.9°C since 1900\n• Sea level rise: 3.3mm/year (accelerating to 4.6mm/year)\n• Ocean heat content: Record highs\n• Marine heat waves: 2x more frequent\n\n🐠 Impacts:\n• Coral bleaching: 50% of reefs damaged\n• Fish migration: Species moving poleward\n• Oxygen loss: 2% decline since 1960\n• Stronger hurricanes: More Category 4-5 storms\n\n🌊 Sea Level Rise Threats:\n• 680M people in coastal areas at risk\n• $1 trillion coastal property threatened\n• Islands disappearing (Kiribati, Tuvalu)\n\nWant to learn about coral reefs or acidification?";
    }
    
    // Carbon Footprint & Emissions (Enhanced)
    if (lowerMessage.includes('carbon footprint') || lowerMessage.includes('emissions')) {
        if (history.length > 0) {
            const comparison = totalEmissions > 100 ? 'higher than optimal' : totalEmissions > 50 ? 'moderate' : 'relatively low';
            return `Based on your tracking history, you've recorded ${history.length} activities with a total of ${totalEmissions.toFixed(2)} kg of CO2 emissions. Your average per activity is ${avgEmissions} kg - this is ${comparison}. ${getPersonalizedTip(avgEmissions)}\n\n📊 Context:\n• Average American: 16 tons CO2/year\n• Average European: 8 tons CO2/year\n• Sustainable target: 2-3 tons CO2/year\n• Your tracked total: ${(totalEmissions/1000).toFixed(2)} tons\n\n🎯 To reach sustainable levels, we all need to reduce by 80-90%! Want personalized reduction strategies?`;
        } else {
            return "You haven't tracked any activities yet. Let me explain carbon footprints! 👣\n\n🌍 What is it?\nYour carbon footprint is the total amount of greenhouse gases (CO2, methane, etc.) your activities produce, measured in CO2 equivalents.\n\n📊 Average Footprints:\n• USA: 16 tons CO2/year per person\n• EU: 8 tons CO2/year\n• China: 7 tons CO2/year\n• India: 2 tons CO2/year\n• Sustainable target: 2-3 tons/year\n\n🔍 Breakdown (typical US person):\n• Transportation: 29% (4.6 tons)\n• Electricity: 25% (4 tons)\n• Food: 13% (2.1 tons)\n• Products/services: 19% (3 tons)\n• Heating/cooling: 14% (2.3 tons)\n\nStart tracking above to understand your impact!";
        }
    }
    
    // Transportation & Climate
    if (lowerMessage.includes('electric') || lowerMessage.includes('ev') || lowerMessage.includes('vehicle') || lowerMessage.includes('transport') || lowerMessage.includes('car')) {
        if (lowerMessage.includes('flying') || lowerMessage.includes('plane') || lowerMessage.includes('flight')) {
            return "Aviation is a major climate challenge! ✈️\n\n📊 Flight Emissions:\n• Short flight (< 1500km): ~250 kg CO2\n• Medium flight (1500-4000km): ~1,000 kg CO2\n• Long-haul (> 4000km): ~2,000-4,000 kg CO2\n• NYC to London: 1,600 kg CO2 per passenger\n\n🌍 Global Impact:\n• Aviation = 2.5% of global CO2 (8-11% including contrails)\n• Growing 5% per year pre-pandemic\n• Hardest sector to decarbonize\n\n💡 Smart Alternatives:\n• Video conferences instead of business travel\n• Train for trips < 1000km (10x less emissions)\n• Direct flights (takeoff/landing = 25% of fuel)\n• Economy class (business = 3x emissions per person)\n\n⚡ Future Solutions:\n• Sustainable aviation fuel (SAF) - 80% less emissions\n• Electric planes (short routes by 2030)\n• Hydrogen aircraft (by 2035)\n\nOne transatlantic flight = your car for a year!";
        }
        return "Transportation accounts for 29% of global emissions! 🚗\n\n⚡ Electric Vehicles (EVs):\n• 50-70% lower lifetime emissions than gas cars\n• Zero tailpipe emissions\n• 3x more energy efficient than gas engines\n• Break even with gas car after ~20,000km\n\n📊 EV Progress:\n• 26 million EVs on roads globally (2023)\n• Sales growing 40% annually\n• Battery costs down 90% since 2010\n• Range now 300-500km standard\n\n🌱 Emission Comparisons (per km):\n• Gas car: 250g CO2\n• Hybrid: 120g CO2\n• EV (average grid): 80g CO2\n• EV (renewable energy): 10g CO2\n• E-bike: 5g CO2\n• Public transit: 40g CO2\n• Walking/cycling: 0g CO2\n\n💰 Total Cost:\n• EVs cheaper to own over 5+ years\n• Fuel savings: $1,000-2,000/year\n• Maintenance: 40% less than gas cars\n\nReady to go electric?";
    }
    
    // Nature-Based Solutions
    if (lowerMessage.includes('tree') || lowerMessage.includes('plant') || lowerMessage.includes('forest') || lowerMessage.includes('reforestation')) {
        if (totalEmissions > 0) {
            const treesNeeded = calculateTreesNeeded(totalEmissions / 1000);
            return `Based on your current emissions of ${totalEmissions.toFixed(2)} kg CO2, you would need to plant approximately ${treesNeeded} trees to offset your tracked activities! 🌳\n\n🌲 Tree Power:\n• One mature tree: 21.77 kg CO2/year absorbed\n• Over 40 years: ~1 ton CO2 total\n• Plus oxygen for 2 people\n• Reduces urban temps 2-8°C\n• Filters air pollution\n\n🌍 Forests & Climate:\n• Store 2.6 trillion tons CO2 (30x annual emissions!)\n• Amazon alone: 150-200 billion tons stored\n• Deforestation: 10% of global emissions\n• Reforestation: Could capture 205 billion tons by 2050\n\n✅ Best Actions:\n• Support reforestation projects\n• Plant native species\n• Protect existing forests (more important!)\n• Reduce paper/wood consumption\n• Choose FSC-certified products\n\n🎯 Fun fact: We need 1 trillion trees to significantly impact climate!`;
        }
        return "Trees and forests are nature's carbon capture technology! 🌳\n\n🌲 Forest Facts:\n• Store 2.6 trillion tons CO2 (300x annual emissions!)\n• Absorb 2.6 billion tons CO2/year\n• Cover 31% of land area\n• Home to 80% of terrestrial biodiversity\n\n⚠️ Deforestation Crisis:\n• Losing 10M hectares/year (size of Portugal!)\n• 10% of global emissions\n• Amazon: 20% already lost\n• At risk: Amazon tipping point at 20-25% loss\n\n🌱 Solutions Work:\n• Reforestation could capture 200B tons by 2050\n• Cost-effective: $0.10-$1 per ton CO2\n• Co-benefits: biodiversity, jobs, water\n\n🎯 Different Approaches:\n• Reforestation: Replant cleared areas\n• Afforestation: New forests on non-forest land\n• Avoided deforestation: Protect existing (most important!)\n• Agroforestry: Mix trees with farming\n\n💚 Take Action:\n• Support conservation orgs\n• Plant native species\n• Reduce consumption\n• Choose sustainable products\n\nProtecting existing forests is MORE important than planting new ones!";
    }
    
    // Reduce/Lower/Decrease
    if (lowerMessage.includes('reduce') || lowerMessage.includes('lower') || lowerMessage.includes('decrease')) {
        return `Here are the most impactful ways to reduce your carbon footprint! 💪\n\n🎯 HIGH IMPACT Actions (2+ tons CO2/year):\n1️⃣ Live car-free or drive electric: Save 2.4 tons/year\n2️⃣ Avoid one transatlantic flight: Save 1.6 tons\n3️⃣ Switch to green energy: Save 1.5 tons/year\n4️⃣ Plant-based diet: Save 0.8 tons/year\n5️⃣ Improve home insulation: Save 1 ton/year\n\n💡 MEDIUM IMPACT (0.2-0.8 tons/year):\n• Buy renewable energy: 0.8 tons\n• Electric heat pump: 0.6 tons\n• Hybrid car: 0.5 tons\n• Reduce shopping: 0.5 tons\n• Recycle rigorously: 0.2 tons\n\n🌱 EVERYDAY ACTIONS:\n• Line-dry clothes vs dryer: 0.3 tons/year\n• LED bulbs throughout home: 0.15 tons/year\n• Eat local/seasonal: 0.1 tons/year\n• Reduce food waste: 0.1 tons/year\n\n📊 Your tracked emissions: ${totalEmissions.toFixed(2)} kg\nTarget reduction: 80-90% to reach sustainability!\n\nWhich actions can you commit to?`;
    }
    
    // Food & Agriculture
    if (lowerMessage.includes('food') || lowerMessage.includes('diet') || lowerMessage.includes('meat') || lowerMessage.includes('beef') || lowerMessage.includes('agriculture')) {
        return "Food production is responsible for 26% of global emissions! 🍽️\n\n📊 Carbon Intensity (kg CO2 per kg food):\n• Beef: 60 kg (worst!)\n• Lamb: 24 kg\n• Cheese: 21 kg\n• Chocolate: 19 kg\n• Pork: 7 kg\n• Chicken: 6 kg\n• Eggs: 4.5 kg\n• Rice: 4 kg\n• Tofu: 2 kg\n• Vegetables: 2 kg\n• Beans/lentils: 0.9 kg (best!)\n\n🌱 Diet Impact (annual emissions):\n• High meat diet: 3.3 tons CO2\n• Medium meat: 2.5 tons CO2\n• Low meat: 1.9 tons CO2\n• Vegetarian: 1.7 tons CO2\n• Vegan: 1.5 tons CO2\n\n🔥 Why Beef is Worst:\n• Cattle burp methane (28x worse than CO2)\n• Requires 25kg feed per 1kg beef\n• Needs 15,000 liters water per kg\n• Causes deforestation for grazing\n\n✅ Smart Swaps:\n• Replace beef with chicken: 90% less emissions\n• One plant-based meal/day: 2.5 kg CO2 saved\n• Buy local/seasonal: Reduces transport\n• Reduce food waste: 30% of food wasted globally\n\n🎯 Best action: Eat less meat, especially beef!";
    }
    
    // Recycling & Waste
    if (lowerMessage.includes('recycle') || lowerMessage.includes('waste') || lowerMessage.includes('plastic') || lowerMessage.includes('circular')) {
        return "Waste management and recycling are crucial for fighting climate change! ♻️\n\n📊 Waste Impact:\n• 3.3% of global emissions\n• Landfills produce methane (28x worse than CO2)\n• Plastic production: 4-8% of global oil use\n• US produces 260M tons waste/year\n\n💡 Recycling Benefits:\n• Aluminum recycling: Saves 95% energy vs new\n• Paper recycling: Saves 17 trees + 7,000 gal water per ton\n• Plastic recycling: Saves 2 tons CO2 per ton\n• Glass recycling: Saves 30% energy\n• Steel recycling: Saves 60% energy\n\n🌍 Global Plastic Crisis:\n• 400M tons produced annually\n• Only 9% ever recycled\n• 8M tons enter oceans yearly\n• Takes 400+ years to decompose\n• Microplastics in our food/water\n\n✅ The 5 R's (in order of importance!):\n1️⃣ REFUSE: Say no to single-use items\n2️⃣ REDUCE: Buy less, choose quality\n3️⃣ REUSE: Repair, refill, donate\n4️⃣ REPURPOSE: Creative new uses\n5️⃣ RECYCLE: Last resort!\n\n🎯 Take Action:\n• Zero waste lifestyle: Saves 1 ton CO2/year\n• Compost food scraps: Reduces methane\n• Buy secondhand: Saves 25kg CO2 per item\n• Avoid single-use plastic\n\nRecycling is good, but refusing/reducing is better!";
    }
    
    // Help/What Can You Do
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        return "I'm your comprehensive AI climate & sustainability assistant! 🤖🌍\n\n💬 Ask me about:\n\n🌡️ CLIMATE SCIENCE:\n• Climate change causes, impacts, solutions\n• Greenhouse gases & tipping points\n• Regional climate impacts\n• Ocean acidification & sea level rise\n• Latest climate data and trends\n\n🌱 SUSTAINABILITY TOPICS:\n• Your carbon footprint & how to reduce it\n• Renewable energy (solar, wind, hydro)\n• Electric vehicles & sustainable transport\n• Plant-based diets & food sustainability\n• Recycling, waste, & circular economy\n\n🌳 SOLUTIONS & ACTION:\n• Individual high-impact actions\n• Nature-based solutions & reforestation\n• Clean energy transition\n• Climate policy & Paris Agreement\n• Carbon offsetting strategies\n\n📊 PERSONALIZED INSIGHTS:\n• Analyze your emission patterns\n• Track your progress\n• Get tailored recommendations\n• Compare to global averages\n\n💡 Just ask me anything! Examples:\n• 'Tell me about tipping points'\n• 'How do oceans affect climate?'\n• 'What's the Paris Agreement?'\n• 'How can I reduce my footprint?'\n• 'Why is methane important?'\n\nI'm here to help you understand and act on climate change! 🌍";
    }
    
    // Default response with intelligence
    return `That's a great question about climate and sustainability! 🌍\n\n💡 I can help you with:\n\n📚 Climate Topics:\n• Climate science & greenhouse gases\n• Impacts & tipping points\n• Regional effects\n• Ocean & Arctic changes\n\n🌱 Solutions:\n• Reducing your carbon footprint\n• Renewable energy\n• Sustainable transport\n• Plant-based eating\n• Waste reduction\n\n🎯 Quick Actions:\n1. Track your footprint using the calculator above\n2. Check out the eco-tips section\n3. Explore Climate Info page\n\nTry asking:\n• "What causes climate change?"\n• "How can I reduce my footprint?"\n• "Tell me about electric vehicles"\n• "What are climate tipping points?"\n• "How does food impact climate?"\n\nWhat specific topic interests you most? 🌱`;
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

