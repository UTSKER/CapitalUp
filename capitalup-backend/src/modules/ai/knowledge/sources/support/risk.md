# CapitalUp Risk Management & Trading Limits Guide

This document outlines the risk checks, parameters, trading halts, and rate limits configured on the CapitalUp paper trading platform to maintain market integrity and prevent excessive losses.

## 1. Core Risk Limits and Parameters

The system enforces several pre-trade risk checks before approving any order. The default limits are:

- **Maximum Order Quantity**: `100,000` shares per individual order.
- **Maximum Order Value**: `₹5,000,000` (50 Lakhs) per individual order.
- **Maximum Position Quantity**: A user cannot hold more than `250,000` shares in a single stock ticker at any time.
- **Daily Loss Limit**: `₹5,000` per trading day.
  - If a user's realized daily loss reaches or exceeds `₹5,000`, all further `BUY` orders are blocked.
  - Only risk-reducing `SELL` orders are permitted once the daily loss limit has been breached.
- **Price Band Rule**: Order prices must be within `±25%` of the active live market price.
  - Orders priced outside this permitted risk band (e.g. buying too high or selling too low) fail with a `PRICE_BAND_BREACH` error.

## 2. Platform Activity Limits (Rate Limiting)

To prevent platform abuse and ensure server stability, order rates are managed:
- **Maximum Orders Per Minute**: `60` orders per user per minute.
- Exceeding this rate triggers a `RATE_LIMIT_EXCEEDED` reject response with the message *"Too many orders; please retry shortly"*.

## 3. Circuit Breakers and Trading Halts

Administrators can temporarily halt trading when necessary:
- **Halt Scopes**: Halted globally (across all instruments) or on a specific stock ticker (`SYMBOL` scope).
- If a circuit breaker is active, any new order submissions will fail with the rejection code `CIRCUIT_BREAKER_ACTIVE`.

## 4. Duplicate Order Safeguards

To prevent double-trading due to network retries, the platform enforces idempotency:
- Every order input can optionally include a `clientOrderId`.
- If a user submits a second order request with a `clientOrderId` that has already been registered in the database, it fails immediately with a `DUPLICATE_ORDER` rejection.
