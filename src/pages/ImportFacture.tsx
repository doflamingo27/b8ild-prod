import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AutoExtractUploader from '@/components/AutoExtractUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Receipt, Info } from 'lucide-react';

export default function ImportFacturePage() {
  const { user } = useAuth();
  const { data: entreprise } = useQuery({
    queryKey: ['entreprise', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('entreprises').select('id').eq('proprietaire_user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  if (!entreprise) return <div className="flex items-center justify-center min-h-screen"><p>Chargement…</p></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Receipt className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Importer une facture / un frais</h1>
          <p className="text-muted-foreground">PDF ou image. Extraction 100% automatique.</p>
        </div>
      </div>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Les factures importées ici seront en attente d'affectation. 
          Vous pourrez les affecter à un chantier depuis la vue "Factures" ou depuis le détail d'un chantier.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle>Document</CardTitle>
          <CardDescription>Uploadez pour extraction automatique.</CardDescription>
        </CardHeader>
        <CardContent>
          <AutoExtractUploader module="factures" entrepriseId={entreprise.id} />
        </CardContent>
      </Card>
    </div>
  );
}
