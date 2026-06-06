-- Invitation codes table: admin-issued, role-bound, single-use
CREATE TABLE public.invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin','supervisor','viewer')),
  used boolean NOT NULL DEFAULT false,
  used_by_name text,
  used_at timestamptz,
  created_by text,
  expires_at timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitation_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitation_codes TO authenticated;
GRANT ALL ON public.invitation_codes TO service_role;

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access to invitation_codes"
ON public.invitation_codes FOR ALL
USING (true) WITH CHECK (true);

CREATE INDEX idx_invitation_codes_code ON public.invitation_codes(code);