USE skillswap;

-- Run once, after add-swap-requests.sql. This migration never deletes requests.
-- If duplicate pending pairs already exist, the unique index will fail safely.
-- Review those rows before retrying; do not silently discard their history.
ALTER TABLE swap_requests
    ADD COLUMN pair_low INT GENERATED ALWAYS AS (LEAST(sender_id, recipient_id)) STORED,
    ADD COLUMN pair_high INT GENERATED ALWAYS AS (GREATEST(sender_id, recipient_id)) STORED,
    ADD COLUMN pending_pair TINYINT GENERATED ALWAYS AS (
        CASE WHEN status = 'pending' THEN 1 ELSE NULL END
    ) STORED,
    ADD UNIQUE KEY unique_pending_pair (pair_low, pair_high, pending_pair);
