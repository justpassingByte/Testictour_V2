-- Add platform fee override on tournaments (nullable = use plan default)
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "platformFeePercent" DOUBLE PRECISION;

-- Player check-in fields
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "checkedIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);
