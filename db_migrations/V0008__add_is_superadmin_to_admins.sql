ALTER TABLE t_p49537415_secre_club_access.admins ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;
UPDATE t_p49537415_secre_club_access.admins SET is_superadmin = true;