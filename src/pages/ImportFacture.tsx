import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import AutoExtractUploader from '@/components/AutoExtractUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

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

  if (!entreprise) return <DashboardLayout><div>Chargement…</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Receipt className="h-8 w-8 text-primary" />
          <div><h1 className="text-3xl font-bold">Importer une facture / un frais</h1>
          <p className="text-muted-foreground">PDF ou image. Extraction 100% automatique.</p></div>
        </div>
        <Card><CardHeader><CardTitle>Document</CardTitle><CardDescription>Uploadez pour extraction automatique.</CardDescription></CardHeader>
        <CardContent><AutoExtractUploader module="factures" entrepriseId={entreprise.id} /></CardContent></Card>
      </div>
    </DashboardLayout>
  );
}
