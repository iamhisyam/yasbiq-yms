-- Make COA global: deduplicate per-unit COA into one set, drop unit_id, unique on kode

-- Step 1: For each kode, keep the earliest COA record
WITH dedup AS (
  SELECT DISTINCT ON (kode) id AS keep_id, kode
  FROM coa
  ORDER BY kode, created_at ASC
)
UPDATE jurnal_detail SET coa_id = dedup.keep_id
FROM dedup
JOIN coa AS dup ON dup.kode = dedup.kode AND dup.id != dedup.keep_id
WHERE jurnal_detail.coa_id = dup.id;

-- Step 2: Delete duplicate COA records (only keep one per kode)
DELETE FROM coa
WHERE id NOT IN (SELECT DISTINCT ON (kode) id FROM coa ORDER BY kode, created_at ASC);

-- Step 3: Drop old unique constraint on (unit_id, kode)
ALTER TABLE coa DROP CONSTRAINT IF EXISTS coa_unit_id_kode_unique;

-- Step 4: Add unique constraint on kode alone
ALTER TABLE coa ADD CONSTRAINT coa_kode_unique UNIQUE (kode);

-- Step 5: Drop the now-unnecessary unit_id column
ALTER TABLE coa DROP COLUMN IF EXISTS unit_id;
