import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Rapports
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez et exportez vos rapports
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
          <CardDescription>
            Les fonctionnalités de rapports et d'exports seront disponibles prochainement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Vous pourrez bientôt exporter vos données au format PDF et CSV.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
