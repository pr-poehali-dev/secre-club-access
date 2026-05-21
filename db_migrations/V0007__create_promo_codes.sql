CREATE TABLE t_p49537415_secre_club_access.promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  privilege VARCHAR(32) NOT NULL DEFAULT 'client',
  no_timer BOOLEAN NOT NULL DEFAULT FALSE,
  duration_seconds INTEGER,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
