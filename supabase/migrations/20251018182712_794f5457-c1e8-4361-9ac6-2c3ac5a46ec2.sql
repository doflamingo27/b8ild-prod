-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'chef', 'ouvrier');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom TEXT,
  nom TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create entreprises table
CREATE TABLE public.entreprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  adresse TEXT,
  siret TEXT,
  specialite_metier TEXT,
  logo_url TEXT,
  proprietaire_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company"
  ON public.entreprises FOR SELECT
  USING (auth.uid() = proprietaire_user_id);

CREATE POLICY "Users can insert own company"
  ON public.entreprises FOR INSERT
  WITH CHECK (auth.uid() = proprietaire_user_id);

CREATE POLICY "Users can update own company"
  ON public.entreprises FOR UPDATE
  USING (auth.uid() = proprietaire_user_id);

-- Create membres_equipe table
CREATE TABLE public.membres_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  poste TEXT,
  specialite TEXT,
  taux_horaire DECIMAL(10,2) NOT NULL DEFAULT 0,
  charges_salariales DECIMAL(5,2) NOT NULL DEFAULT 0,
  charges_patronales DECIMAL(5,2) NOT NULL DEFAULT 0,
  actif BOOLEAN DEFAULT TRUE,
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.membres_equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team members"
  ON public.membres_equipe FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.entreprises
      WHERE entreprises.id = membres_equipe.entreprise_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own team members"
  ON public.membres_equipe FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entreprises
      WHERE entreprises.id = membres_equipe.entreprise_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own team members"
  ON public.membres_equipe FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.entreprises
      WHERE entreprises.id = membres_equipe.entreprise_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own team members"
  ON public.membres_equipe FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.entreprises
      WHERE entreprises.id = membres_equipe.entreprise_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

-- Create chantiers table
CREATE TABLE public.chantiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_chantier TEXT NOT NULL,
  client TEXT NOT NULL,
  adresse TEXT,
  duree_estimee INTEGER,
  description TEXT,
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE NOT NULL,
  statut TEXT DEFAULT 'actif',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.chantiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON public.chantiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.entreprises
      WHERE entreprises.id = chantiers.entreprise_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own projects"
  ON public.chantiers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entreprises
      WHERE entreprises.id = chantiers.entreprise_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own projects"
  ON public.chantiers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.entreprises
      WHERE entreprises.id = chantiers.entreprise_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own projects"
  ON public.chantiers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.entreprises
      WHERE entreprises.id = chantiers.entreprise_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

-- Create devis table
CREATE TABLE public.devis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fichier_url TEXT,
  montant_ht DECIMAL(10,2) NOT NULL DEFAULT 0,
  montant_ttc DECIMAL(10,2) NOT NULL DEFAULT 0,
  tva DECIMAL(5,2) NOT NULL DEFAULT 20,
  chantier_id UUID REFERENCES public.chantiers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quotes"
  ON public.devis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = devis.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own quotes"
  ON public.devis FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = devis.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own quotes"
  ON public.devis FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = devis.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own quotes"
  ON public.devis FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = devis.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

-- Create factures_fournisseurs table
CREATE TABLE public.factures_fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fichier_url TEXT,
  montant_ht DECIMAL(10,2) NOT NULL DEFAULT 0,
  categorie TEXT NOT NULL,
  fournisseur TEXT,
  date_facture DATE,
  chantier_id UUID REFERENCES public.chantiers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.factures_fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON public.factures_fournisseurs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = factures_fournisseurs.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoices"
  ON public.factures_fournisseurs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = factures_fournisseurs.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own invoices"
  ON public.factures_fournisseurs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = factures_fournisseurs.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own invoices"
  ON public.factures_fournisseurs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = factures_fournisseurs.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

-- Create equipe_chantier table
CREATE TABLE public.equipe_chantier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membre_id UUID REFERENCES public.membres_equipe(id) ON DELETE CASCADE NOT NULL,
  chantier_id UUID REFERENCES public.chantiers(id) ON DELETE CASCADE NOT NULL,
  role_chantier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(membre_id, chantier_id)
);

ALTER TABLE public.equipe_chantier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project teams"
  ON public.equipe_chantier FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = equipe_chantier.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project teams"
  ON public.equipe_chantier FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = equipe_chantier.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project teams"
  ON public.equipe_chantier FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = equipe_chantier.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project teams"
  ON public.equipe_chantier FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = equipe_chantier.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

-- Create frais_chantier table
CREATE TABLE public.frais_chantier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID REFERENCES public.chantiers(id) ON DELETE CASCADE NOT NULL,
  type_frais TEXT NOT NULL,
  montant_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  date_frais DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.frais_chantier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
  ON public.frais_chantier FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = frais_chantier.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own expenses"
  ON public.frais_chantier FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = frais_chantier.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own expenses"
  ON public.frais_chantier FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = frais_chantier.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own expenses"
  ON public.frais_chantier FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chantiers
      JOIN public.entreprises ON entreprises.id = chantiers.entreprise_id
      WHERE chantiers.id = frais_chantier.chantier_id
        AND entreprises.proprietaire_user_id = auth.uid()
    )
  );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('devis', 'devis', false);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('factures', 'factures', false);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true);

-- Storage policies for devis
CREATE POLICY "Users can view own devis files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'devis' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own devis files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'devis' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own devis files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'devis' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own devis files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'devis' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for factures
CREATE POLICY "Users can view own factures files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'factures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own factures files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'factures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own factures files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'factures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own factures files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'factures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for logos
CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Users can upload own logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.entreprises
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.membres_equipe
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.chantiers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.factures_fournisseurs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.frais_chantier
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, prenom, nom, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'prenom',
    NEW.raw_user_meta_data->>'nom',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();