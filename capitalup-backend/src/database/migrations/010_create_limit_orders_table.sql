CREATE TABLE IF NOT EXISTS limit_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id BIGINT NOT NULL,

    symbol VARCHAR(50) NOT NULL,

    side VARCHAR(10) NOT NULL,

    quantity INTEGER NOT NULL,

    limit_price NUMERIC(12,2) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT NOW(),

    executed_at TIMESTAMP,

    CONSTRAINT fk_limit_order_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);