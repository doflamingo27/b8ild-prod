-- Phase 1: Fondations Solides - Tables de base

-- 1. Table pour gérer les absences/congés de l'équipe
CREATE TABLE IF NOT EXISTS public.absences_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membre_id UUID NOT NULL REFERENCES public.membres_equipe(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  type_absence TEXT NOT NULL CHECK (type_absence IN ('conges', 'maladie', 'formation', 'autre')),
  motif TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT absences_dates_valides CHECK (date_fin >= date_debut)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_absences_membre ON public.absences_equipe(membre_id);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON public.absences_equipe(date_debut, date_fin);

-- RLS pour absences_equipe
ALTER TABLE public.absences_equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team absences"
  ON public.absences_equipe FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.membres_equipe me
      JOIN public.entreprises e ON e.id = me.entreprise_id
      WHERE me.id = absences_equipe.membre_id
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own team absences"
  ON public.absences_equipe FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.membres_equipe me
      JOIN public.entreprises e ON e.id = me.entreprise_id
      WHERE me.id = absences_equipe.membre_id
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own team absences"
  ON public.absences_equipe FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.membres_equipe me
      JOIN public.entreprises e ON e.id = me.entreprise_id
      WHERE me.id = absences_equipe.membre_id
      AND e.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own team absences"
  ON public.absences_equipe FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.membres_equipe me
      JOIN public.entreprises e ON e.id = me.entreprise_id
      WHERE me.id = absences_equipe.membre_id
      AND e.proprietaire_user_id = auth.uid()
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_absences_updated_at
  BEFORE UPDATE ON public.absences_equipe
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. Ajouter date_fin_prevue aux chantiers
ALTER TABLE public.chantiers 
  ADD COLUMN IF NOT EXISTS date_fin_prevue DATE;

-- 3. Table pour l'audit trail
CREATE TABLE IF NOT EXISTS public.historique_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour optimiser les requêtes d'historique
CREATE INDEX IF NOT EXISTS idx_historique_table_record ON public.historique_modifications(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_historique_user ON public.historique_modifications(user_id);
CREATE INDEX IF NOT EXISTS idx_historique_created ON public.historique_modifications(created_at DESC);

-- RLS pour historique (lecture seule pour tous les utilisateurs authentifiés de leur entreprise)
ALTER TABLE public.historique_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view modifications history"
  ON public.historique_modifications FOR SELECT
  USING (auth.uid() = user_id);

-- Fonction générique pour logger les modifications
CREATE OR REPLACE FUNCTION public.log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Récupérer l'utilisateur actuel
  v_user_id := auth.uid();
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.historique_modifications (
      table_name, record_id, action, old_values, user_id, user_email
    ) VALUES (
      TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), v_user_id, v_user_email
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.historique_modifications (
      table_name, record_id, action, old_values, new_values, user_id, user_email
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id, v_user_email
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.historique_modifications (
      table_name, record_id, action, new_values, user_id, user_email
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), v_user_id, v_user_email
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Créer les triggers d'audit sur les tables importantes
CREATE TRIGGER audit_chantiers
  AFTER INSERT OR UPDATE OR DELETE ON public.chantiers
  FOR EACH ROW EXECUTE FUNCTION public.log_modification();

CREATE TRIGGER audit_devis
  AFTER INSERT OR UPDATE OR DELETE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.log_modification();

CREATE TRIGGER audit_factures
  AFTER INSERT OR UPDATE OR DELETE ON public.factures_fournisseurs
  FOR EACH ROW EXECUTE FUNCTION public.log_modification();

CREATE TRIGGER audit_frais
  AFTER INSERT OR UPDATE OR DELETE ON public.frais_chantier
  FOR EACH ROW EXECUTE FUNCTION public.log_modification();

CREATE TRIGGER audit_equipe
  AFTER INSERT OR UPDATE OR DELETE ON public.equipe_chantier
  FOR EACH ROW EXECUTE FUNCTION public.log_modification();

CREATE TRIGGER audit_membres
  AFTER INSERT OR UPDATE OR DELETE ON public.membres_equipe
  FOR EACH ROW EXECUTE FUNCTION public.log_modification();

-- 4. Table pour les notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'alert', 'success', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- RLS pour notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Table pour les préférences de notifications
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_alertes_critiques BOOLEAN DEFAULT true,
  email_alertes_budget BOOLEAN DEFAULT true,
  email_commentaires BOOLEAN DEFAULT false,
  email_modifications BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS pour préférences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Créer automatiquement les préférences par défaut pour les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_notification_preferences_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();