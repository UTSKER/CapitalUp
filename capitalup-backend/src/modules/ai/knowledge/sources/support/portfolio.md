# Section: Portfolio Holdings and Wealth Tracking
## Topic: Share Holdings, Profit and Loss (P&L), and Asset Allocation

### Overview
This document specifies how stock balances, user holdings, and investment values are calculated.

---

### Topic: Reviewing User Portfolio
- **Endpoint:** `GET /api/v1/portfolio/`
- **Fields Returned:**
  - `holdings`: Array of active stock balances.
    - `symbol`: Ticker symbol.
    - `quantity`: Number of shares owned.
    - `average_buy_price`: Weighted average price at which shares were purchased.
  - `summary`:
    - `total_investment_value`: Sum of quantity × average buy price for all holdings.
    - `total_current_value`: Sum of quantity × current market price.
    - `total_profit_loss`: Current Value - Investment Value.
    - `pnl_percentage`: Net return rate.

---

### Topic: Troubleshooting and Error Scenarios
1. **Error: Empty holdings array returned**
   - **Reason:** The user account has not executed any buy trades or has sold all previously owned stocks.
   - **Solution:** This is normal behavior for new accounts. Place a buy order to populate your portfolio.
2. **Error: Profit/Loss metrics show old data (Pricing Lag)**
   - **Reason:** Portfolio summaries derive live values from `stock:<symbol>` keys in the Redis cache. If the market data cron is delayed, P&L calculations will reflect the last cached price instead of real-time market value.
   - **Solution:** Verify the Redis service state and the active live data feeds.
