// const userLocation = document.getElementById("userlocation"),
//       converter = document.getElementById("converter"),
//       temperature = document.querySelector(".temperature"),
//       feelsLike = document.querySelector(".feelslike"),
//       description = document.querySelector(".description"),
//       date = document.querySelector(".date"),
//       city = document.querySelector(".city"),
//       HValue = document.getElementById("Hvalue"),
//       WValue = document.getElementById("Wvalue"),
//       SRValue = document.getElementById("SRValue"),
//       SSValue = document.getElementById("SSValue"),
//       CValue = document.getElementById("Cvalue"),
//       UVValue = document.getElementById("UVvalue"),
//       PValue = document.getElementById("Pvalue"),
//       forecast = document.querySelector(".forcast");

// const API_KEY = "f87ad396f76b1e5b6ccf8c08ef4e894c";  
// const WEATHER_API_ENDPOINT = `https://api.openweathermap.org/data/2.5/weather?appid=${API_KEY}&units=metric&q=`;

// function findUserLocation() {
//     const location = userLocation.value.trim();
//     if (!location) {
//         alert("Please enter a valid city name");
//         return;
//     }

//     fetch(WEATHER_API_ENDPOINT + location)
//         .then(response => response.json())
//         .then(data => {
//             if (data.cod === "404") {
//                 alert("City not found. Please enter a valid city name.");
//             } else {
//                 updateWeatherData(data);
//             }
//         })
//         .catch(error => console.error("Error fetching weather data:", error));
        
// }

// function updateWeatherData(data) {
//     city.textContent = data.name + ", " + data.sys.country;
//     temperature.textContent = Math.round(data.main.temp) + "℃";
//     feelsLike.textContent = "Feels like: " + Math.round(data.main.feels_like) + "℃";
//     description.textContent = data.weather[0].description;
//     date.textContent = new Date().toLocaleDateString();
//     HValue.textContent = data.main.humidity + "%";
//     WValue.textContent = data.wind.speed + " m/s";
//     SRValue.textContent = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
//     SSValue.textContent = new Date(data.sys.sunset * 1000).toLocaleTimeString();
//     CValue.textContent = data.clouds.all + "%";
//     PValue.textContent = data.main.pressure + " hPa";
// }

// // Event Listener for Enter key
// userLocation.addEventListener("keypress", function(event) {
//     if (event.key === "Enter") {
//         findUserLocation();
//     }
// });


"use strict";

/**
 * Live Weather
 * Fetches current conditions + a 5-day forecast from the OpenWeather API
 * and renders them into the page. No frameworks, no build step.
 */

// ---------------------------------------------------------------------------
// DOM references (cached once)
// ---------------------------------------------------------------------------
const els = {
  form: document.querySelector(".search"),
  cityInput: document.getElementById("city-input"),
  unitSelect: document.getElementById("unit-select"),
  searchStatus: document.getElementById("search-status"),

  body: document.querySelector(".now-panel__body"),
  weatherIcon: document.querySelector(".weather-icon"),
  temperatureValue: document.querySelector(".temperature__value"),
  temperatureUnit: document.querySelector(".temperature__unit"),
  feelsLike: document.querySelector(".feels-like"),
  conditions: document.querySelector(".conditions"),
  date: document.querySelector(".date"),
  location: document.querySelector(".location"),

  humidity: document.getElementById("humidity-value"),
  wind: document.getElementById("wind-value"),
  sunrise: document.getElementById("sunrise-value"),
  sunset: document.getElementById("sunset-value"),
  clouds: document.getElementById("clouds-value"),
  pressure: document.getElementById("pressure-value"),

  forecastList: document.querySelector(".forecast"),
  forecastTemplate: document.getElementById("forecast-card-template"),
};

const API_BASE = "https://api.openweathermap.org/data/2.5";

// Keeps the most recent API responses so switching °C/°F doesn't require
// a fresh network request.
let lastCurrentWeather = null;
let lastForecast = null;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Converts a Celsius value to Fahrenheit, rounded to the nearest degree. */
function celsiusToFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

/** Formats a temperature (stored in °C) according to the selected unit. */
function formatTemperature(celsius, unit) {
  const value = unit === "F" ? celsiusToFahrenheit(celsius) : Math.round(celsius);
  return value;
}

/**
 * Formats a UTC unix timestamp as a local clock time *for the city being
 * viewed*, using that city's UTC offset — not the visitor's browser
 * timezone. OpenWeather returns `timezone` as a UTC offset in seconds.
 */
function formatCityTime(unixSeconds, timezoneOffsetSeconds, options) {
  const shifted = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
  return shifted.toLocaleTimeString("en-US", { ...options, timeZone: "UTC" });
}

function formatCityDate(unixSeconds, timezoneOffsetSeconds) {
  const shifted = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
  return shifted.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDayLabel(unixSeconds, timezoneOffsetSeconds) {
  const shifted = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
  return shifted.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function weatherIconUrl(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

// ---------------------------------------------------------------------------
// Status / error UI
// ---------------------------------------------------------------------------

function setStatus(message, state) {
  els.searchStatus.textContent = message;
  if (state) {
    els.searchStatus.dataset.state = state;
  } else {
    delete els.searchStatus.dataset.state;
  }
}

function clearStatus() {
  setStatus("", null);
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  // OpenWeather returns HTTP 200 with a string "cod" for some errors and a
  // numeric cod for others, so check loosely and surface their message.
  if (String(data.cod) !== "200") {
    const message = data.message ? data.message : "Something went wrong fetching the weather.";
    throw new Error(message);
  }

  return data;
}

async function getCurrentWeather(city) {
  const url = `${API_BASE}/weather?q=${encodeURIComponent(city)}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=${CONFIG.UNITS}`;
  return fetchJson(url);
}

async function getForecast(city) {
  const url = `${API_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=${CONFIG.UNITS}`;
  return fetchJson(url);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderCurrentWeather(data, unit) {
  const { name, sys, main, weather, wind, clouds, dt, timezone } = data;
  const condition = weather[0];

  els.weatherIcon.src = weatherIconUrl(condition.icon);
  els.weatherIcon.alt = condition.description;

  els.temperatureValue.textContent = formatTemperature(main.temp, unit);
  els.temperatureUnit.textContent = unit === "F" ? "°F" : "°C";
  els.feelsLike.textContent = `Feels like ${formatTemperature(main.feels_like, unit)}°${unit}`;
  els.conditions.textContent = condition.description;

  els.date.textContent = formatCityDate(dt, timezone);
  els.location.textContent = `${name}, ${sys.country}`;

  els.humidity.textContent = `${main.humidity}%`;
  els.wind.textContent = `${wind.speed.toFixed(1)} m/s`;
  els.sunrise.textContent = formatCityTime(sys.sunrise, timezone, { hour: "numeric", minute: "2-digit" });
  els.sunset.textContent = formatCityTime(sys.sunset, timezone, { hour: "numeric", minute: "2-digit" });
  els.clouds.textContent = `${clouds.all}%`;
  els.pressure.textContent = `${main.pressure} hPa`;

  els.body.hidden = false;
}

/** Groups 3-hour forecast entries into one summary card per calendar day. */
function summarizeDailyForecast(forecastData) {
  const { city, list } = forecastData;
  const byDay = new Map();

  for (const entry of list) {
    const dayKey = formatCityDate(entry.dt, city.timezone);
    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, { entries: [], representative: entry });
    }
    const bucket = byDay.get(dayKey);
    bucket.entries.push(entry);

    // Prefer the entry closest to local noon as the "representative" icon.
    const hour = new Date((entry.dt + city.timezone) * 1000).getUTCHours();
    const currentHour = new Date((bucket.representative.dt + city.timezone) * 1000).getUTCHours();
    if (Math.abs(hour - 12) < Math.abs(currentHour - 12)) {
      bucket.representative = entry;
    }
  }

  return [...byDay.values()]
    .slice(0, 5)
    .map(({ entries, representative }) => {
      const temps = entries.map((e) => e.main.temp);
      return {
        dt: representative.dt,
        timezone: city.timezone,
        icon: representative.weather[0].icon,
        description: representative.weather[0].description,
        high: Math.max(...temps),
        low: Math.min(...temps),
      };
    });
}

function renderForecast(dailySummaries, unit) {
  els.forecastList.innerHTML = "";

  dailySummaries.forEach((day, index) => {
    const card = els.forecastTemplate.content.cloneNode(true);

    card.querySelector(".forecast-card__day").textContent = formatDayLabel(day.dt, day.timezone);

    const icon = card.querySelector(".forecast-card__icon");
    icon.src = weatherIconUrl(day.icon);
    icon.alt = day.description;

    card.querySelector(".forecast-card__high").textContent = `${formatTemperature(day.high, unit)}°`;
    card.querySelector(".forecast-card__low").textContent = `${formatTemperature(day.low, unit)}°`;

    const li = card.querySelector(".forecast-card");
    li.style.animationDelay = `${index * 60}ms`;

    els.forecastList.appendChild(card);
  });
}

function renderAll(unit) {
  if (lastCurrentWeather) renderCurrentWeather(lastCurrentWeather, unit);
  if (lastForecast) renderForecast(lastForecast, unit);
}

// ---------------------------------------------------------------------------
// Search flow
// ---------------------------------------------------------------------------

function validateCityName(rawValue) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { valid: false, message: "Please enter a city name." };
  }
  if (trimmed.length < 2) {
    return { valid: false, message: "City name is too short." };
  }
  // Letters (incl. accents), spaces, hyphens, apostrophes, and commas
  // (e.g. "Winston-Salem", "Cote d'Ivoire", "Paris, FR").
  if (!/^[\p{L}\s'\-,.]+$/u.test(trimmed)) {
    return { valid: false, message: "City name can only contain letters, spaces, and hyphens." };
  }
  return { valid: true, value: trimmed };
}

async function handleSearch(city) {
  clearStatus();
  setStatus("Loading weather…", "loading");

  try {
    const [current, forecast] = await Promise.all([getCurrentWeather(city), getForecast(city)]);

    lastCurrentWeather = current;
    lastForecast = summarizeDailyForecast(forecast);

    renderAll(els.unitSelect.value);
    clearStatus();
  } catch (error) {
    els.body.hidden = true;
    const friendlyMessage =
      error.message === "city not found"
        ? "City not found. Please check the spelling and try again."
        : "Couldn't fetch the weather right now. Please try again in a moment.";
    setStatus(friendlyMessage, "error");
    console.error("Weather fetch failed:", error);
  }
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const { valid, value, message } = validateCityName(els.cityInput.value);
  if (!valid) {
    setStatus(message, "error");
    return;
  }
  handleSearch(value);
});

els.unitSelect.addEventListener("change", () => {
  renderAll(els.unitSelect.value);
});