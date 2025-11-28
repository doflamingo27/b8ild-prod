-- Sécuriser les fonctions trigger restantes

ALTER FUNCTION public.set_enterprise_defaults() SET search_path TO 'public';
ALTER FUNCTION public.sync_budget_from_devis() SET search_path TO 'public';
ALTER FUNCTION public.update_membre_statut_from_affectations() SET search_path TO 'public';
ALTER FUNCTION public.update_membre_statut_on_delete_affectation() SET search_path TO 'public';