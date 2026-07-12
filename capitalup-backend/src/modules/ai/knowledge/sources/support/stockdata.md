# Section: Market Data and Stock Information
## Topic: Live Ticker, Stock Quotes, and Historic Market Charts

### Overview
This document specifies endpoints and data feeds for listing stocks, fetching live quotes, and reviewing historic stock pricing.

---

### Topic: Listing Active Stocks
- **Endpoint:** `GET /api/v1/stocks/`
- **Response Format:**
  - Returns a list of all stocks currently active and supported by the exchange platform (includes company names, ticker symbols, and industries).

---

### Topic: Searching Stocks
- **Endpoint:** `GET /api/v1/stocks/search`
- **Query Parameter:** `q` (e.g., `GET /api/v1/stocks/search?q=tcs`)
- **Behavior:** Performs partial match queries against stock company names and symbols.

---

### Topic: Fetching Live Stock Quotes
- **Endpoint:** `GET /api/v1/stocks/quote/:symbol`
- **Live Updates:**
  - Ticker updates are broadcast via WebSockets (`Socket.io`) on the channel `"market:update"`.
  - The live feed is backed by a Redis client subscription to `"market:update"`, allowing instant updates on the user's dashboard.
- **Fields Returned:**
  - `symbol`: Ticker string (e.g., `JIOFIN.NS`).
  - `price`: Current trading price.
  - `volume`: Shares traded in the session.
  - `timestamp`: Current update time.

---

### Topic: Fetching Historical Stock Data
- **Endpoint:** `GET /api/v1/stocks/:symbol/history`
- **Behavior:** Retrieves daily, weekly, or monthly historical candlestick charts (Open, High, Low, Close, and Volume) for the specified ticker. Used by the frontend to render line charts and interactive stock analysis panels.

---

### Topic: Troubleshooting and Error Scenarios
1. **Error: "Live price not available for this symbol"**
   - **Reason:** The Redis server does not contain a cached price for the requested symbol. This can occur if the exchange scheduler/cron job has stopped running or the stock has been unlisted.
   - **Solution:** Verify that the symbol exists in the stock list (`GET /api/v1/stocks/`) and ensure the Redis daemon and price job are active.
2. **Error: "Stock history not found"**
   - **Reason:** The stock history database table does not contain past records for this ticker.
   - **Solution:** Select an active exchange ticker (e.g., `JIOFIN.NS`).
3. **Error: "WebSocket connection failed" or static price**
   - **Reason:** The frontend client cannot connect to the backend WebSocket port (CORS origin mismatch or backend service offline).
   - **Solution:** Verify the `VITE_API_URL` environment configuration on the frontend and check the backend server logs for WebSocket bind errors.
