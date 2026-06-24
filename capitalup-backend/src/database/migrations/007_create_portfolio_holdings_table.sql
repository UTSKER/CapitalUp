CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id BIGINT NOT NULL,

    symbol VARCHAR(50) NOT NULL,

    quantity INTEGER NOT NULL CHECK (quantity > 0),

    average_buy_price NUMERIC(12,2) NOT NULL CHECK (average_buy_price > 0),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_portfolio_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_portfolio_user_symbol
        UNIQUE(user_id, symbol)
);