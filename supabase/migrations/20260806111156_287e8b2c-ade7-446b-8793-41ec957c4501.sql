-- roles
CREATE TYPE public.app_role AS ENUM ('admin','lab_manager','member');
CREATE TYPE public.booking_status AS ENUM ('pending','approved','rejected','completed','cancelled');
CREATE TYPE public.equipment_status AS ENUM ('available','maintenance','offline');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  organization text,
  user_type text NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, organization, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'organization',
    COALESCE(NEW.raw_user_meta_data->>'user_type','student')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text,
  city text NOT NULL,
  state text NOT NULL,
  kind text NOT NULL DEFAULT 'University',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.institutions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.institutions TO authenticated;
GRANT ALL ON public.institutions TO service_role;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institutions public read" ON public.institutions FOR SELECT USING (true);
CREATE POLICY "institutions managed" ON public.institutions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lab_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lab_manager'));

CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  manufacturer text NOT NULL,
  model text,
  description text NOT NULL DEFAULT '',
  capabilities text[] NOT NULL DEFAULT '{}',
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolution text,
  status public.equipment_status NOT NULL DEFAULT 'available',
  rate_student numeric NOT NULL DEFAULT 0,
  rate_researcher numeric NOT NULL DEFAULT 0,
  rate_startup numeric NOT NULL DEFAULT 0,
  rate_industry numeric NOT NULL DEFAULT 0,
  total_hours_used numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.equipment TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment public read" ON public.equipment FOR SELECT USING (true);
CREATE POLICY "equipment managed" ON public.equipment FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lab_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lab_manager'));

CREATE TABLE public.maintenance_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  note text
);
GRANT SELECT ON public.maintenance_windows TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.maintenance_windows TO authenticated;
GRANT ALL ON public.maintenance_windows TO service_role;
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance public read" ON public.maintenance_windows FOR SELECT USING (true);
CREATE POLICY "maintenance managed" ON public.maintenance_windows FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lab_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lab_manager'));

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text NOT NULL UNIQUE DEFAULT 'LS-' || upper(substr(md5(random()::text),1,8)),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  purpose text NOT NULL,
  sample_details text,
  requester_tier text NOT NULL DEFAULT 'student',
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings read" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lab_manager'));
CREATE POLICY "own bookings insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookings update" ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lab_manager'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lab_manager'));

CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN RAISE EXCEPTION 'End time must be after start time'; END IF;
  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.equipment_id = NEW.equipment_id AND b.id <> NEW.id
      AND b.status IN ('pending','approved') AND b.starts_at < NEW.ends_at AND b.ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'This slot overlaps an existing booking';
  END IF;
  IF EXISTS (SELECT 1 FROM public.maintenance_windows m WHERE m.equipment_id = NEW.equipment_id
      AND m.starts_at < NEW.ends_at AND m.ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'This slot falls inside a maintenance window';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER bookings_validate BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking();

-- anonymous-safe busy slots (no PII)
CREATE OR REPLACE FUNCTION public.get_busy_slots(_equipment_id uuid)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz, kind text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.starts_at, b.ends_at, CASE WHEN b.status='approved' THEN 'reserved' ELSE 'pending' END
  FROM public.bookings b WHERE b.equipment_id = _equipment_id AND b.status IN ('pending','approved')
  UNION ALL
  SELECT m.starts_at, m.ends_at, 'maintenance' FROM public.maintenance_windows m WHERE m.equipment_id = _equipment_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_busy_slots(uuid) TO anon, authenticated;

-- seed
INSERT INTO public.institutions (id, name, short_name, city, state, kind, lat, lng) VALUES
('11111111-1111-1111-1111-111111111101','Indian Institute of Technology Bombay','IIT Bombay','Mumbai','Maharashtra','IIT',19.1334,72.9133),
('11111111-1111-1111-1111-111111111102','Indian Institute of Science','IISc Bangalore','Bengaluru','Karnataka','Institute',13.0219,77.5671),
('11111111-1111-1111-1111-111111111103','Indian Institute of Technology Madras','IIT Madras','Chennai','Tamil Nadu','IIT',12.9915,80.2337),
('11111111-1111-1111-1111-111111111104','Indian Institute of Technology Delhi','IIT Delhi','New Delhi','Delhi','IIT',28.5450,77.1926),
('11111111-1111-1111-1111-111111111105','National Institute of Technology Trichy','NIT Trichy','Tiruchirappalli','Tamil Nadu','NIT',10.7590,78.8140),
('11111111-1111-1111-1111-111111111106','CSIR National Chemical Laboratory','CSIR-NCL','Pune','Maharashtra','Government Lab',18.5416,73.8080),
('11111111-1111-1111-1111-111111111107','Anna University CEG Campus','Anna University','Chennai','Tamil Nadu','University',13.0108,80.2350),
('11111111-1111-1111-1111-111111111108','Vellore Institute of Technology','VIT Vellore','Vellore','Tamil Nadu','University',12.9692,79.1559);

INSERT INTO public.equipment (id, institution_id, name, category, manufacturer, model, description, capabilities, specs, resolution, status, rate_student, rate_researcher, rate_startup, rate_industry, total_hours_used) VALUES
('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111101','Field Emission SEM','SEM','JEOL','JSM-7600F','High resolution field emission scanning electron microscope with EDS attachment for surface morphology and elemental mapping.','{"Surface morphology","Elemental mapping (EDS)","Fractography","Nanoparticle sizing"}','{"resolution_nm":1.0,"magnification":"25x - 1,000,000x","accelerating_voltage":"0.1 - 30 kV"}','1 nm','available',600,1200,3500,6000,412),
('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111102','Transmission Electron Microscope','TEM','FEI','Tecnai G2 F30','300 kV TEM for atomic-scale imaging, SAED and STEM analysis of thin specimens.','{"Atomic imaging","SAED diffraction","STEM","Crystal defect analysis"}','{"resolution_nm":0.2,"accelerating_voltage":"300 kV","modes":"TEM/STEM"}','0.2 nm','available',900,1800,5200,9000,268),
('22222222-2222-2222-2222-222222222203','11111111-1111-1111-1111-111111111103','Atomic Force Microscope','AFM','Bruker','Dimension Icon','Multimode AFM for nanoscale topography, roughness and mechanical property mapping.','{"Surface topography","Roughness analysis","Nanomechanical mapping","Thin film characterisation"}','{"resolution_nm":0.1,"scan_size":"90 x 90 um","modes":"Tapping/Contact/PeakForce"}','0.1 nm','available',450,900,2400,4200,331),
('22222222-2222-2222-2222-222222222204','11111111-1111-1111-1111-111111111101','X-Ray Diffractometer','XRD','Rigaku','SmartLab SE','Powder and thin-film XRD for phase identification, crystallite size and residual stress.','{"Phase identification","Crystallite size","Thin film XRD","Residual stress"}','{"source":"Cu K-alpha","range":"3 - 145 degrees 2-theta","step":"0.0001 deg"}','0.0001 deg','available',350,700,1900,3400,540),
('22222222-2222-2222-2222-222222222205','11111111-1111-1111-1111-111111111104','FTIR Spectrometer','FTIR','PerkinElmer','Spectrum Two','Fourier transform infrared spectrometer with ATR for functional group identification.','{"Functional group ID","Polymer analysis","ATR sampling","Quality control"}','{"range":"400 - 4000 cm-1","resolution":"0.5 cm-1"}','0.5 cm-1','available',200,400,1100,2000,289),
('22222222-2222-2222-2222-222222222206','11111111-1111-1111-1111-111111111106','HPLC System','HPLC','Agilent','1260 Infinity II','Quaternary HPLC with DAD detector for separation and quantification of organic compounds.','{"Purity analysis","Quantification","Method development","Pharma QC"}','{"detector":"DAD","max_pressure":"600 bar","columns":"C18/C8"}',NULL,'available',400,800,2200,4000,477),
('22222222-2222-2222-2222-222222222207','11111111-1111-1111-1111-111111111102','Real-Time PCR System','PCR','Thermo Fisher','QuantStudio 5','96-well real-time PCR for gene expression, genotyping and pathogen detection.','{"Gene expression","Genotyping","Pathogen detection","qPCR"}','{"wells":96,"channels":6,"ramp_rate":"6.5 C/s"}',NULL,'available',300,600,1600,2800,610),
('22222222-2222-2222-2222-222222222208','11111111-1111-1111-1111-111111111105','Universal Testing Machine','UTM','Instron','5967 (30 kN)','Dual column UTM for tensile, compression, flexural and shear testing of materials.','{"Tensile testing","Compression testing","Flexural testing","ASTM/ISO standards"}','{"capacity_kn":30,"accuracy":"+/- 0.5% of reading","extensometer":"Video"}',NULL,'available',250,500,1400,2600,388),
('22222222-2222-2222-2222-222222222209','11111111-1111-1111-1111-111111111105','3-Axis CNC Milling Machine','CNC','Haas','VF-2','Vertical machining centre for precision metal prototyping and fixture manufacturing.','{"Metal prototyping","Precision milling","Fixture manufacturing","Aluminium/Steel"}','{"travel":"762 x 406 x 508 mm","spindle_rpm":8100,"tolerance_mm":0.01}','0.01 mm','maintenance',300,650,1800,3200,722),
('22222222-2222-2222-2222-222222222210','11111111-1111-1111-1111-111111111107','Industrial SLA 3D Printer','3D Printer','Formlabs','Form 3L','Large format stereolithography printer for high detail functional prototypes.','{"Rapid prototyping","Functional parts","Dental/medical models","High detail resin"}','{"layer_thickness_um":25,"build_volume":"335 x 200 x 300 mm"}','25 um','available',150,300,900,1700,255),
('22222222-2222-2222-2222-222222222211','11111111-1111-1111-1111-111111111108','CO2 Laser Cutter','Laser Cutter','Trotec','Speedy 400','150 W CO2 laser for cutting and engraving acrylic, wood, textiles and paper.','{"Laser cutting","Engraving","Acrylic/Wood","Prototyping"}','{"power_w":150,"bed":"1000 x 610 mm","kerf_mm":0.2}','0.2 mm','available',120,250,700,1300,196),
('22222222-2222-2222-2222-222222222212','11111111-1111-1111-1111-111111111106','UV-Vis Spectrophotometer','Spectrometer','Shimadzu','UV-2600i','Double beam UV-visible spectrophotometer for absorbance, kinetics and band gap studies.','{"Absorbance","Band gap (Tauc)","Reaction kinetics","Concentration assay"}','{"range_nm":"185 - 1400","bandwidth_nm":0.1}','0.1 nm','available',150,300,850,1500,433),
('22222222-2222-2222-2222-222222222213','11111111-1111-1111-1111-111111111103','Raman Spectrometer','Spectrometer','Horiba','LabRAM HR Evolution','Confocal Raman microscope for molecular fingerprinting and 2D material characterisation.','{"Molecular fingerprint","Graphene/2D materials","Stress mapping","Confocal imaging"}','{"lasers":"532/633/785 nm","spectral_resolution":"0.35 cm-1"}','0.35 cm-1','available',500,1000,2700,4800,214),
('22222222-2222-2222-2222-222222222214','11111111-1111-1111-1111-111111111104','Environmental SEM','SEM','Thermo Fisher','Quanta 250','Variable pressure SEM allowing imaging of wet, oily and non-conductive samples.','{"Wet sample imaging","Non-conductive samples","EDS","Low vacuum mode"}','{"resolution_nm":3.0,"modes":"High vac / Low vac / ESEM"}','3 nm','available',450,900,2600,4600,357),
('22222222-2222-2222-2222-222222222215','11111111-1111-1111-1111-111111111101','Optical Metallurgical Microscope','Optical Microscope','Zeiss','Axio Observer 7','Inverted optical microscope for metallographic grain structure and phase analysis.','{"Grain structure","Phase analysis","Metallography","Brightfield/Darkfield"}','{"magnification":"50x - 1000x","camera":"12 MP colour"}','0.2 um','available',100,200,600,1100,502),
('22222222-2222-2222-2222-222222222216','11111111-1111-1111-1111-111111111102','Gas Chromatograph Mass Spectrometer','GC-MS','Agilent','7890B / 5977A','GC-MS for identification and quantification of volatile and semi-volatile compounds.','{"Volatile compound ID","Trace analysis","Environmental testing","Forensics"}','{"mass_range":"1.6 - 1050 amu","detector":"EI/CI"}',NULL,'available',550,1100,3000,5400,301),
('22222222-2222-2222-2222-222222222217','11111111-1111-1111-1111-111111111107','Nanoindentation System','Nanoindenter','Anton Paar','NHT3','Instrumented indentation for hardness and elastic modulus at the nanoscale.','{"Hardness","Elastic modulus","Thin film mechanics","Scratch testing"}','{"load_range":"0.1 - 500 mN","depth_resolution_nm":0.04}','0.04 nm','available',400,800,2100,3800,142),
('22222222-2222-2222-2222-222222222218','11111111-1111-1111-1111-111111111108','Differential Scanning Calorimeter','DSC','TA Instruments','DSC 250','DSC for glass transition, melting, crystallisation and thermal stability studies.','{"Glass transition","Melting point","Crystallinity","Thermal stability"}','{"temp_range":"-90 to 550 C","sensitivity":"0.2 uW"}',NULL,'available',220,450,1200,2200,268);

INSERT INTO public.maintenance_windows (equipment_id, starts_at, ends_at, note) VALUES
('22222222-2222-2222-2222-222222222209', now() + interval '2 days', now() + interval '5 days','Spindle overhaul and recalibration'),
('22222222-2222-2222-2222-222222222201', now() + interval '9 days', now() + interval '9 days 8 hours','Filament replacement'),
('22222222-2222-2222-2222-222222222206', now() + interval '4 days', now() + interval '4 days 6 hours','Pump seal service');