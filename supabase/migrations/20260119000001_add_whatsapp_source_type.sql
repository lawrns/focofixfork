-- Add 'whatsapp' to proposal source_type enum
-- This allows proposals to be created from WhatsApp messages

-- Drop the existing constraint
ALTER TABLE foco_proposals
  DROP CONSTRAINT IF EXISTS foco_proposals_source_type_check;

-- Add new constraint with 'whatsapp' included
ALTER TABLE foco_proposals
  ADD CONSTRAINT foco_proposals_source_type_check
  CHECK (source_type IN ('voice', 'text', 'file', 'api', 'whatsapp'));

COMMENT ON COLUMN foco_proposals.source_type IS 'Origin of the proposal: voice (from voice input), text (from chat), file (from uploaded document), api (from external system), whatsapp (from WhatsApp integration)';
