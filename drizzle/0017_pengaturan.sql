-- 0016: Pengaturan table

CREATE TABLE pengaturan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(unit_id, key)
);
