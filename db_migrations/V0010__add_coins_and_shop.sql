CREATE TABLE IF NOT EXISTS t_p49537415_secre_club_access.coins (
    user_id integer NOT NULL PRIMARY KEY REFERENCES t_p49537415_secre_club_access.users(id),
    balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p49537415_secre_club_access.shop_items (
    id serial PRIMARY KEY,
    name character varying(255) NOT NULL,
    description text,
    price integer NOT NULL CHECK (price > 0),
    privilege character varying(32) NOT NULL DEFAULT 'client',
    no_timer boolean NOT NULL DEFAULT false,
    duration_seconds integer NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p49537415_secre_club_access.shop_purchases (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES t_p49537415_secre_club_access.users(id),
    item_id integer NOT NULL REFERENCES t_p49537415_secre_club_access.shop_items(id),
    price_paid integer NOT NULL,
    purchased_at timestamp with time zone NOT NULL DEFAULT now()
);