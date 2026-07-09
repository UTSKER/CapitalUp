# Section: Trading and Order Management
## Topic: Buy, Sell, Limit, Stop, and OCO Orders

### Overview
This document specifies the trading mechanisms, order types, validation rules, and matching engine behaviors of CapitalUp.

---

### Topic: Order Types
CapitalUp supports four primary order configurations for buying and selling assets:
1. **Market Orders:** Executed immediately at the current market price.
2. **Limit Orders:** Queued in the order book and executed only when the stock hits a specified price or better.
3. **Stop-Loss Orders (Stop Orders):** Triggered when the market price crosses a designated "stop price."
4. **One-Cancels-the-Other (OCO) Orders:** A pair of linked orders (typically a limit order and a stop order) where the execution of one automatically cancels the other.

---

### Topic: Placing Orders (Standard buy/sell)
- **Endpoint:** `POST /api/v1/orders/`
- **Payload Parameters:**
  - `symbol`: The stock ticker symbol (e.g., `NSE:TCS`, `JIOFIN.NS`).
  - `side`: `"BUY"` or `"SELL"`.
  - `type`: `"MARKET"` or `"LIMIT"`.
  - `quantity`: Positive integer representing the number of shares.
  - `price`: Required for `"LIMIT"` type (positive numeric value).
- **Validation & Check:**
  - **Available Balance Check:** For `"BUY"` orders, the server locks the required margin (price × quantity) and verifies the user has enough available wallet balance.
  - **Portfolio Holding Check:** For `"SELL"` orders, the server checks if the user holds enough shares of the specified symbol.
  - **KYC Status Check:** The user's KYC record must be `APPROVED` to place any trade.

---

### Topic: Limit Orders
- **Endpoints:**
  - Create Limit Order: `POST /api/v1/limit-orders/`
  - Get Active Limit Orders: `GET /api/v1/limit-orders/`
  - Cancel Limit Order: `DELETE /api/v1/limit-orders/:id`
- **Matching Engine Mechanism:**
  - Active limit orders are sent to the custom in-memory Order Book.
  - Buy Limit prices are sorted in descending order; Sell Limit prices are sorted in ascending order (using Red-Black Trees).
  - Orders at the same price are matched in FIFO (First-In, First-Out) time priority (using Doubly Linked Lists).

---

### Topic: Stop-Loss (Stop) Orders
- **Endpoints:**
  - Create Stop Order: `POST /api/v1/stop-orders/`
  - Get Active Stop Orders: `GET /api/v1/stop-orders/`
  - Cancel Stop Order: `DELETE /api/v1/stop-orders/:id`
- **Trigger Logic:**
  - **Buy Stop:** Must be placed **above** the current market price. It triggers when the stock price rises to or crosses the stop price.
  - **Sell Stop:** Must be placed **below** the current market price. It triggers when the stock price drops to or crosses the stop price.
  - When the market price updates, a background cron check calls `processMarketPriceForStopOrders` to trigger eligible stop orders, turning them into market or limit orders.

---

### Topic: OCO (One-Cancels-the-Other) Orchestration
- **Mechanism:**
  - Connects a **Stop-Loss** and a **Target (Limit)** order.
  - If the stock hits the target (Limit Order executes), the stop-loss (Stop Order) is automatically cancelled via `cancelLinkedStopForLimitOrder` to release balance/holdings.
  - If the stock hits the stop price (Stop Order triggers), the target (Limit Order) is automatically cancelled via `cancelLinkedLimitForStopOrder`.
  - Notifications are pushed to the user upon auto-cancellation of OCO links.

---

### Topic: Troubleshooting and Error Scenarios
1. **Error: "Live price not available" or "Live price not available for this symbol"**
   - **Reason:** The Redis cache does not contain the live stock price (key `stock:<symbol>`). This occurs if the market feed is offline or if the stock symbol is invalid.
   - **Solution:** Verify the symbol format and ensure the stock data updater job is running.
2. **Error: "Insufficient cash balance. Required: X, Available: Y"**
   - **Reason:** You tried to place a BUY order, but your wallet available balance is less than the total order cost (quantity × price).
   - **Solution:** Deposit additional funds or reduce the order quantity.
3. **Error: "You do not own this stock" or "Insufficient holdings"**
   - **Reason:** You attempted a SELL order for a stock that is either not present in your portfolio or has a lower quantity than what you are attempting to sell.
   - **Solution:** Reduce the order quantity to match your holdings, or check your active positions.
4. **Error: "Stop price must be within ±25% of current price (X - Y)"**
   - **Reason:** To prevent extreme order anomalies, stop prices must be placed within a 25% corridor of the current live market price.
   - **Solution:** Adjust the stop price closer to the market value.
5. **Error: "Stop price for buying must be above the current market price"**
   - **Reason:** A BUY STOP order triggers when the price breaks out upward, so the stop price must be higher than the current market price.
   - **Solution:** Place a stop price higher than the market price, or use a Limit Order.
6. **Error: "Stop price for selling must be below the current market price"**
   - **Reason:** A SELL STOP (stop-loss) triggers when the price drops, so the stop price must be lower than the current market price.
   - **Solution:** Place the stop price lower than the current price.
7. **Error: "Linked limit order not found" or "Linked limit order must be a SELL order for the same stock"**
   - **Reason:** OCO order validation failed. The linked limit order ID specified does not exist, belongs to another user, or is not an active SELL order for the same stock symbol.
   - **Solution:** Verify the limit order details before linking.
8. **Error: "Linked limit order quantity must match the stop order quantity"**
   - **Reason:** The OCO target and stop-loss legs must be set for the exact same number of shares.
   - **Solution:** Adjust both order quantities to match.
9. **Error: "KYC verification is required"**
   - **Reason:** You tried to place a trade, but your account's KYC status is not `APPROVED`.
   - **Solution:** Complete your KYC form and wait for approval.
