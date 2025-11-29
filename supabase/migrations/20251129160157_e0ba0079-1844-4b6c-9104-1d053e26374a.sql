-- =========================================================
-- MIGRATION SÉCURITÉ MVP : Correction des 6 tables exposées
-- =========================================================
-- Cette migration sécurise 6 tables critiques qui étaient
-- exposées publiquement sans authentification requise
-- =========================================================

-- 1. Sécurisation table PROFILES
-- Problème : Données personnelles exposées publiquement
-- Solution : Exiger l'authentification pour toutes les opérations
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "profiles_require_auth_select" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "profiles_require_auth_update" ON public.profiles
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- 2. Sécurisation table TENDER_INBOX
-- Problème : Emails et données sensibles exposés
-- Solution : Restreindre aux utilisateurs authentifiés propriétaires
DROP POLICY IF EXISTS "ti_all" ON public.tender_inbox;

CREATE POLICY "tender_inbox_require_auth_select" ON public.tender_inbox
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "tender_inbox_require_auth_insert" ON public.tender_inbox
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "tender_inbox_require_auth_update" ON public.tender_inbox
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "tender_inbox_require_auth_delete" ON public.tender_inbox
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. Sécurisation table ENTREPRISES
-- Problème : Informations d'entreprise (SIRET, adresse) accessibles publiquement
-- Solution : Exiger authentification et vérifier propriétaire
CREATE POLICY "entreprises_require_auth_select" ON public.entreprises
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = proprietaire_user_id);

CREATE POLICY "entreprises_require_auth_insert" ON public.entreprises
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = proprietaire_user_id);

CREATE POLICY "entreprises_require_auth_update" ON public.entreprises
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = proprietaire_user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = proprietaire_user_id);

CREATE POLICY "entreprises_require_auth_delete" ON public.entreprises
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = proprietaire_user_id);

-- 4. Sécurisation table CHANTIERS (renforcement)
-- Problème : Vérifications insuffisantes
-- Solution : Renforcer les politiques existantes avec vérification auth stricte
DROP POLICY IF EXISTS "Users can view own projects" ON public.chantiers;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.chantiers;
DROP POLICY IF EXISTS "Users can update own projects" ON public.chantiers;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.chantiers;

CREATE POLICY "chantiers_require_auth_select" ON public.chantiers
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.entreprises 
      WHERE entreprises.id = chantiers.entreprise_id 
      AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "chantiers_require_auth_insert" ON public.chantiers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.entreprises 
      WHERE entreprises.id = chantiers.entreprise_id 
      AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "chantiers_require_auth_update" ON public.chantiers
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.entreprises 
      WHERE entreprises.id = chantiers.entreprise_id 
      AND entreprises.proprietaire_user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.entreprises 
      WHERE entreprises.id = chantiers.entreprise_id 
      AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "chantiers_require_auth_delete" ON public.chantiers
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.entreprises 
      WHERE entreprises.id = chantiers.entreprise_id 
      AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

-- 5. Sécurisation table MEMBRES_EQUIPE (renforcement)
-- Problème : Informations salariales potentiellement exposées
-- Solution : Renforcer avec vérification auth stricte
DROP POLICY IF EXISTS "Users can view own team members" ON public.membres_equipe;
DROP POLICY IF EXISTS "Users can insert own team members" ON public.membres_equipe;
DROP POLICY IF EXISTS "Users can update own team members" ON public.membres_equipe;
DROP POLICY IF EXISTS "Users can delete own team members" ON public.membres_equipe;

CREATE POLICY "membres_equipe_require_auth_select" ON public.membres_equipe
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.entreprises 
      WHERE entreprises.id = membres_equipe.entreprise_id 
      AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "membres_equipe_require_auth_insert" ON public.membres_equipe
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.entreprises 
      WHERE entreprises.id = membres_equipe.entreprise_id 
      AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "membres_equipe_require_auth_update" ON public.membres_equipe
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.entreprises 
      WHERE entreprises.id = membres_equipe.entreprise_id 
      AND entreprises.proprietaire_user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.entreprises 
      WHERE entreprises.id = membres_equipe.entreprise_id 
      AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "membres_equipe_require_auth_delete" ON public.membres_equipe
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.entreprises 
      WHERE entreprises.id = membres_equipe.entreprise_id 
      AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

-- 6. Sécurisation table HISTORIQUE_MODIFICATIONS
-- Problème : Logs d'audit exposés (pourraient révéler structure données)
-- Solution : Renforcer politique existante avec auth stricte
DROP POLICY IF EXISTS "Users can view modifications history" ON public.historique_modifications;

CREATE POLICY "historique_modifications_require_auth_select" ON public.historique_modifications
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Vérification finale : S'assurer que RLS est activé sur toutes ces tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membres_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historique_modifications ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- FIN MIGRATION SÉCURITÉ MVP
-- =========================================================
-- Toutes les tables critiques sont maintenant sécurisées
-- avec authentification obligatoire et vérification stricte
-- des propriétaires pour chaque opération CRUD
-- =========================================================