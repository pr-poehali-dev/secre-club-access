INSERT INTO t_p49537415_secre_club_access.users (username, password_hash)
SELECT 'Lavrov1yList', encode(sha256('changeme123'::bytea), 'hex')
WHERE NOT EXISTS (
  SELECT 1 FROM t_p49537415_secre_club_access.users WHERE username = 'Lavrov1yList'
);

CREATE TABLE IF NOT EXISTS t_p49537415_secre_club_access.admins (
  user_id INTEGER PRIMARY KEY REFERENCES t_p49537415_secre_club_access.users(id)
);

INSERT INTO t_p49537415_secre_club_access.admins (user_id)
SELECT id FROM t_p49537415_secre_club_access.users WHERE username = 'Lavrov1yList'
ON CONFLICT DO NOTHING;