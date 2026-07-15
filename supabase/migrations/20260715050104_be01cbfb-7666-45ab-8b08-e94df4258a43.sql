
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_user_created_idx ON public.audit_log(user_id, created_at DESC);
CREATE INDEX audit_log_event_idx ON public.audit_log(event, created_at DESC);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own audit rows"
  ON public.audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own audit rows"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
