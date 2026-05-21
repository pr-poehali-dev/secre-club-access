CREATE TABLE IF NOT EXISTS t_p49537415_secre_club_access.passes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES t_p49537415_secre_club_access.users(id),
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client','helper','admator','developer')),
  created_by INTEGER REFERENCES t_p49537415_secre_club_access.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE t_p49537415_secre_club_access.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client'
  CHECK (role IN ('client','helper','admator','developer'));