-- Add unique constraint on penggajian_komponen (unit_id, kode) for onConflictDoNothing
CREATE UNIQUE INDEX IF NOT EXISTS penggajian_komponen_unit_kode_idx ON penggajian_komponen(unit_id, kode);
