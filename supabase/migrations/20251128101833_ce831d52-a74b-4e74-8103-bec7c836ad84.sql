-- Ajouter search_path aux fonctions sans cette directive pour améliorer la sécurité

ALTER FUNCTION public.has_role(uuid, app_role) SET search_path TO 'public';
ALTER FUNCTION public.handle_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.update_equipes_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.log_modification() SET search_path TO 'public';
ALTER FUNCTION public.create_default_notification_preferences() SET search_path TO 'public';
ALTER FUNCTION public.safe_pct_fr(text) SET search_path TO 'public';
ALTER FUNCTION public.trg_recalc_dispatch() SET search_path TO 'public';
ALTER FUNCTION public.snapshot_chantier_daily() SET search_path TO 'public';