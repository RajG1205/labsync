-- 1. profiles: remove public read
DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "profiles readable to self and staff"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lab_manager'));
REVOKE SELECT ON public.profiles FROM anon;

-- 2. equipment: authenticated-only base table
DROP POLICY IF EXISTS "equipment public read" ON public.equipment;
CREATE POLICY "equipment read authenticated"
ON public.equipment FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.equipment FROM anon;

-- 3. institutions: authenticated-only base table
DROP POLICY IF EXISTS "institutions public read" ON public.institutions;
CREATE POLICY "institutions read authenticated"
ON public.institutions FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.institutions FROM anon;

-- 4. maintenance windows: authenticated only
DROP POLICY IF EXISTS "maintenance public read" ON public.maintenance_windows;
CREATE POLICY "maintenance read authenticated"
ON public.maintenance_windows FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.maintenance_windows FROM anon;

-- 5. Public marketing catalog views (deliberately public, no pricing / usage / PII)
CREATE OR REPLACE VIEW public.institutions_public AS
SELECT id, name, short_name, city, state, kind, lat, lng FROM public.institutions;

CREATE OR REPLACE VIEW public.equipment_public AS
SELECT e.id, e.institution_id, e.name, e.category, e.manufacturer, e.model, e.description,
       e.capabilities, e.specs, e.resolution, e.status,
       i.name AS inst_name, i.short_name AS inst_short_name, i.city AS inst_city,
       i.state AS inst_state, i.kind AS inst_kind, i.lat AS inst_lat, i.lng AS inst_lng
FROM public.equipment e JOIN public.institutions i ON i.id = e.institution_id;

GRANT SELECT ON public.institutions_public TO anon, authenticated;
GRANT SELECT ON public.equipment_public TO anon, authenticated;

-- 6. SECURITY DEFINER functions: keep them off the public API surface
REVOKE ALL ON FUNCTION public.get_busy_slots(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_busy_slots(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_booking() FROM PUBLIC, anon, authenticated;