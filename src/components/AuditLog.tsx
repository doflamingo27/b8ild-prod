import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuditLog } from "@/hooks/useAuditLog";
import { FileEdit, PlusCircle, Trash2 } from "lucide-react";

interface AuditLogProps {
  tableName?: string;
  recordId?: string;
  limit?: number;
  className?: string;
}

const AuditLog = ({ tableName, recordId, limit = 20, className }: AuditLogProps) => {
  const { logs, loading, getActionLabel, getTableLabel } = useAuditLog({
    tableName,
    recordId,
    limit,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "INSERT":
        return <PlusCircle className="h-4 w-4 text-success" />;
      case "UPDATE":
        return <FileEdit className="h-4 w-4 text-warning" />;
      case "DELETE":
        return <Trash2 className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getActionVariant = (action: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (action) {
      case "INSERT":
        return "default";
      case "UPDATE":
        return "secondary";
      case "DELETE":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Historique des modifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Historique des modifications</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Aucune modification enregistrée
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 pb-4 border-b last:border-0"
                >
                  <div className="mt-1">{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getActionVariant(log.action)}>
                        {getActionLabel(log.action)}
                      </Badge>
                      <span className="text-sm font-medium">
                        {getTableLabel(log.table_name)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Par {log.user_email || "Système"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditLog;
