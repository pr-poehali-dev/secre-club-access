CREATE TABLE IF NOT EXISTS t_p49537415_secre_club_access.bans (
    user_id integer NOT NULL PRIMARY KEY REFERENCES t_p49537415_secre_club_access.users(id),
    banned_by integer NOT NULL REFERENCES t_p49537415_secre_club_access.users(id),
    reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p49537415_secre_club_access.promo_uses (
    promo_id integer NOT NULL REFERENCES t_p49537415_secre_club_access.promo_codes(id),
    user_id integer NOT NULL REFERENCES t_p49537415_secre_club_access.users(id),
    used_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (promo_id, user_id)
);