ALTER TABLE t_p49537415_secre_club_access.passes RENAME TO passes_old;

CREATE TABLE t_p49537415_secre_club_access.passes (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p49537415_secre_club_access.users(id),
  display_name TEXT NOT NULL,
  privilege TEXT NOT NULL CHECK (privilege IN ('client', 'helper', 'admator', 'developer')),
  no_timer BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_by INTEGER NOT NULL REFERENCES t_p49537415_secre_club_access.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);