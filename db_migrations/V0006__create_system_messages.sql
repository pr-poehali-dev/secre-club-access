CREATE TABLE t_p49537415_secre_club_access.system_messages (
  id SERIAL PRIMARY KEY,
  target_user_id INTEGER REFERENCES t_p49537415_secre_club_access.users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
