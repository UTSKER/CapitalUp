-- Pre-trade risk decisions, reservations, and immutable audit events.
-- These tables deliberately have no foreign keys to order tables: a rejected
-- request has no order row but must still remain auditable.

CREATE TABLE IF NOT EXISTS risk_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id UUID NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    client_order_id VARCHAR(100),
    order_type VARCHAR(20) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL,
    reference_price NUMERIC(12,2) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
    rejection_code VARCHAR(80),
    rejection_message TEXT,
    rule_version VARCHAR(30) NOT NULL DEFAULT 'risk-v1',
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_risk_decisions_client_order
        UNIQUE (user_id, client_order_id)
);

CREATE TABLE IF NOT EXISTS risk_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id UUID NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reservation_type VARCHAR(20) NOT NULL CHECK (reservation_type IN ('CASH', 'HOLDINGS')),
    order_id UUID,
    symbol VARCHAR(50),
    amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'CONSUMED', 'RELEASED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_risk_reservations_active
    ON risk_reservations (user_id, symbol)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_risk_reservations_order
    ON risk_reservations (order_id);

CREATE TABLE IF NOT EXISTS audit_events (
    sequence BIGSERIAL PRIMARY KEY,
    correlation_id UUID NOT NULL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id UUID,
    user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    event_type VARCHAR(80) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity
    ON audit_events (entity_type, entity_id, sequence);

CREATE INDEX IF NOT EXISTS idx_audit_events_correlation
    ON audit_events (correlation_id, sequence);

CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_events are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_events_immutable ON audit_events;
CREATE TRIGGER audit_events_immutable
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
