import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  module: 'ao' | 'factures' | 'frais';
  confidence: number;
  fields: any;
}

export default function AutoFillRecap({ module, confidence, fields }: Props) {
  const getConfidenceBadge = () => {
    if (confidence >= 0.8) {
      return <Badge className="bg-emerald-100 text-emerald-700">Excellent - {Math.round(confidence * 100)}%</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge className="bg-amber-100 text-amber-700">À vérifier - {Math.round(confidence * 100)}%</Badge>;
    } else {
      return <Badge className="bg-rose-100 text-rose-700">Faible - {Math.round(confidence * 100)}%</Badge>;
    }
  };

  const formatValue = (value: any): string => {
    if (value == null || value === '') return '—';
    if (typeof value === 'number') return value.toFixed(2);
    return String(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Extraction automatique</CardTitle>
          {getConfidenceBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {module !== 'ao' && (
            <>
              <div><span className="text-muted-foreground">HT :</span><span className="ml-2 font-semibold">{formatValue(fields.ht)}</span></div>
              <div><span className="text-muted-foreground">TVA % :</span><span className="ml-2 font-semibold">{formatValue(fields.tvaPct)}</span></div>
              <div><span className="text-muted-foreground">TTC :</span><span className="ml-2 font-semibold">{formatValue(fields.net ?? fields.ttc)}</span></div>
              <div><span className="text-muted-foreground">SIRET :</span><span className="ml-2 font-semibold">{formatValue(fields.siret)}</span></div>
            </>
          )}
          {module === 'ao' && (
            <>
              <div className="col-span-2"><span className="text-muted-foreground">Organisme :</span><span className="ml-2 font-semibold">{formatValue(fields.aoOrga)}</span></div>
              <div><span className="text-muted-foreground">Date limite :</span><span className="ml-2 font-semibold">{formatValue(fields.aoDeadline)}</span></div>
              <div><span className="text-muted-foreground">Budget :</span><span className="ml-2 font-semibold">{formatValue(fields.aoBudget)}</span></div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
