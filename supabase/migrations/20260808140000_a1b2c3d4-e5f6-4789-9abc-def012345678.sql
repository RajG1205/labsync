-- Security/correctness fixes found during the pre-GitHub audit:
--
-- 1. `bookings.price` was computed client-side and sent straight through to
--    INSERT — a user could edit the request payload and book any instrument
--    for ₹0. The trigger below recomputes price server-side from the
--    equipment's own rate columns and ignores whatever the client sent.
-- 2. `requester_tier` had no server-side validation — any string was accepted.
-- 3. Bookings could be requested for times already in the past.
-- 4. The frontend (bookings.tsx / dashboard.tsx) reads and displays a
--    `sample_status` column that never existed in the schema, so the
--    dashboard's booking query failed outright. This adds the column plus a
--    trigger that advances it in step with booking status.

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_requester_tier_check
  CHECK (requester_tier IN ('student', 'researcher', 'startup', 'industry'));

CREATE TYPE public.sample_status AS ENUM ('submitted', 'received', 'in_progress', 'analysis', 'report_ready');

ALTER TABLE public.bookings
  ADD COLUMN sample_status public.sample_status NOT NULL DEFAULT 'submitted';

CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  eq RECORD;
  duration_hours numeric;
  computed_price numeric;
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.starts_at < now() THEN
    RAISE EXCEPTION 'Cannot book a time slot in the past';
  END IF;

  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.equipment_id = NEW.equipment_id AND b.id <> NEW.id
      AND b.status IN ('pending','approved') AND b.starts_at < NEW.ends_at AND b.ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'This slot overlaps an existing booking';
  END IF;

  IF EXISTS (SELECT 1 FROM public.maintenance_windows m WHERE m.equipment_id = NEW.equipment_id
      AND m.starts_at < NEW.ends_at AND m.ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'This slot falls inside a maintenance window';
  END IF;

  -- Price is always derived from the equipment's current rate card and the
  -- booking's own duration/tier — never trusted from the client payload.
  SELECT * INTO eq FROM public.equipment WHERE id = NEW.equipment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown equipment';
  END IF;

  duration_hours := EXTRACT(EPOCH FROM (NEW.ends_at - NEW.starts_at)) / 3600.0;

  computed_price := duration_hours * CASE NEW.requester_tier
    WHEN 'student' THEN eq.rate_student
    WHEN 'researcher' THEN eq.rate_researcher
    WHEN 'startup' THEN eq.rate_startup
    ELSE eq.rate_industry
  END;

  NEW.price := round(computed_price, 2);

  RETURN NEW;
END; $$;

-- Advance sample_status alongside booking status transitions:
-- approval starts intake, rejection/cancellation resets it, completion closes it.
CREATE OR REPLACE FUNCTION public.sync_sample_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    NEW.sample_status := 'received';
  ELSIF NEW.status = 'completed' THEN
    NEW.sample_status := 'report_ready';
  ELSIF NEW.status IN ('rejected', 'cancelled') THEN
    NEW.sample_status := 'submitted';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS bookings_sync_sample_status ON public.bookings;
CREATE TRIGGER bookings_sync_sample_status BEFORE UPDATE ON public.bookings
FOR EACH ROW WHEN (NEW.status IS DISTINCT FROM OLD.status) EXECUTE FUNCTION public.sync_sample_status();

REVOKE ALL ON FUNCTION public.sync_sample_status() FROM PUBLIC, anon, authenticated;
