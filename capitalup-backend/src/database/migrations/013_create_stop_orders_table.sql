CREATE TABLE IF NOT EXISTS stop_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id BIGINT NOT NULL,

    symbol VARCHAR(50) NOT NULL,

    side VARCHAR(10) NOT NULL,

    quantity INTEGER NOT NULL,

    stop_price NUMERIC(12,2) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    validity VARCHAR(10) NOT NULL DEFAULT 'DAY',

    executed_price NUMERIC(12,2),

    linked_limit_order_id UUID,

    created_at TIMESTAMP DEFAULT NOW(),

    executed_at TIMESTAMP,

    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_stop_order_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_stop_order_linked_limit
        FOREIGN KEY (linked_limit_order_id)
        REFERENCES limit_orders(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stop_orders_status
    ON stop_orders (status);

CREATE INDEX IF NOT EXISTS idx_stop_orders_user_symbol_side
    ON stop_orders (user_id, symbol, side);

-- At most one live (PENDING) stop leg per limit order (OCO pair)
CREATE UNIQUE INDEX IF NOT EXISTS uq_stop_orders_active_linked_limit
    ON stop_orders (linked_limit_order_id)
    WHERE linked_limit_order_id IS NOT NULL
      AND status = 'PENDING';
