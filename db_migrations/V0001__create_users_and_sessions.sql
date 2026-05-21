CREATE TABLE IF NOT EXISTS t_p49537415_secre_club_access.users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p49537415_secre_club_access.sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p49537415_secre_club_access.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);