-- 0024: Add jenis to bank_account (bank | cash | deposito)

ALTER TABLE bank_account ADD COLUMN IF NOT EXISTS jenis text NOT NULL DEFAULT 'bank';
