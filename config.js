/**
 * App configuration.
 *
 * IMPORTANT: This is a client-side, static site with no build step or server.
 * A key placed here (or anywhere in JS that ships to the browser) is visible
 * to anyone who opens dev tools — there is no way to truly "hide" it in a
 * pure static front end. Moving it here only achieves two things:
 *   1. It keeps secrets out of the app logic in script.js.
 *   2. It gives you ONE file to add to .gitignore so you don't accidentally
 *      commit your real key to a public repo.
 *
 * For real production use, put the API key behind a small backend/serverless
 * proxy and call that from the browser instead of calling OpenWeather directly.
 */
const CONFIG = Object.freeze({
  // Replace with your own key from https://openweathermap.org/api
  OPENWEATHER_API_KEY: "f87ad396f76b1e5b6ccf8c08ef4e894c",
  UNITS: "metric",
});