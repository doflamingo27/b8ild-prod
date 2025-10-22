import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Bug, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface DebugStep {
  step: string;
  status: 'start' | 'success' | 'failed' | 'no_match' | 'partial';
  confidence?: number;
  reason?: string;
  candidates?: any;
  textLength?: number;
  size?: number;
}

interface ExtractionDebugPanelProps {
  debug: {
    steps: DebugStep[];
    timestamp: string;
  };
  visible?: boolean;
}

const ExtractionDebugPanel = ({ debug, visible = false }: ExtractionDebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(visible);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'no_match':
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Bug className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStepLabel = (step: string) => {
    const labels: Record<string, string> = {
      download: 'Téléchargement',
      ocr: 'OCR (Reconnaissance texte)',
      regex_text: 'Extraction Regex (texte)',
      regex_extraction: 'Extraction Regex',
      template_check: 'Vérification template fournisseur',
      template_applied: 'Application template',
      csv_parse: 'Analyse CSV/XLSX',
      ao_focus: 'Extraction AO spécialisée'
    };
    return labels[step] || step;
  };

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024).toFixed(1)} Ko`;
  };

  return (
    <Card className="border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Debug Extraction</CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription className="text-xs">
            {new Date(debug.timestamp).toLocaleString('fr-FR')}
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3">
            {debug.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5">{getStepIcon(step.status)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getStepLabel(step.step)}</span>
                    <Badge variant={
                      step.status === 'success' ? 'default' :
                      step.status === 'failed' ? 'destructive' :
                      'secondary'
                    } className="text-xs">
                      {step.status}
                    </Badge>
                    {step.confidence !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {(step.confidence * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                  
                  {step.reason && (
                    <p className="text-xs text-muted-foreground">{step.reason}</p>
                  )}
                  
                  {step.size && (
                    <p className="text-xs text-muted-foreground">
                      Taille: {formatBytes(step.size)}
                    </p>
                  )}
                  
                  {step.textLength && (
                    <p className="text-xs text-muted-foreground">
                      Texte extrait: {step.textLength} caractères
                    </p>
                  )}
                  
                  {step.candidates && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Voir candidats ({Object.keys(step.candidates).length})
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(step.candidates, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ExtractionDebugPanel;
