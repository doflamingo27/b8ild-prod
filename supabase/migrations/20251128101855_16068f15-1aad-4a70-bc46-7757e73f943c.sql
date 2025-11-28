-- Compléter la sécurisation des fonctions SQL restantes

ALTER FUNCTION public.compute_chantier_metrics(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_current_entreprise() SET search_path TO 'public';
ALTER FUNCTION public.insert_extraction_service(text, uuid, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.jwt_role() SET search_path TO 'public';
ALTER FUNCTION public.safe_num_fr(text, numeric) SET search_path TO 'public';
ALTER FUNCTION public.insert_devis_extraction(uuid, uuid, jsonb) SET search_path TO 'public';