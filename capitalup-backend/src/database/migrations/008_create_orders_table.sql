CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id BIGINT NOT NULL,

    symbol VARCHAR(50) NOT NULL,

    side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),

    quantity INTEGER NOT NULL CHECK (quantity > 0),

    price NUMERIC(12,2) NOT NULL CHECK (price > 0),

    status VARCHAR(20) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);