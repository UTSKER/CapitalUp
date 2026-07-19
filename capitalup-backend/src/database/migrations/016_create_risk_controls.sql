CREATE TABLE IF NOT EXISTS risk_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('GLOBAL', 'SYMBOL')),
    symbol VARCHAR(50),
    trading_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reason TEXT,
    updated_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_risk_controls_scope_symbol UNIQUE (scope, symbol),
    CONSTRAINT chk_symbol_control_scope CHECK (
        (scope = 'GLOBAL' AND symbol IS NULL)
        OR (scope = 'SYMBOL' AND symbol IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_controls_global
    ON risk_controls (scope)
    WHERE scope = 'GLOBAL';

CREATE TABLE IF NOT EXISTS risk_daily_pnl (
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    trading_date DATE NOT NULL DEFAULT CURRENT_DATE,
    realized_pnl NUMERIC(18,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, trading_date)
);
