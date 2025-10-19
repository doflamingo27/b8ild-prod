import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AuditLog = Database["public"]["Tables"]["historique_modifications"]["Row"];

interface UseAuditLogParams {
  tableName?: string;
  recordId?: string;
  limit?: number;
}

export const useAuditLog = ({ tableName, recordId, limit = 50 }: UseAuditLogParams = {}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      let query = supabase
        .from("historique_modifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tableName) {
        query = query.eq("table_name", tableName);
      }

      if (recordId) {
        query = query.eq("record_id", recordId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading audit logs:", error);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    loadLogs();
  }, [tableName, recordId, limit]);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      INSERT: "Création",
      UPDATE: "Modification",
      DELETE: "Suppression",
    };
    return labels[action] || action;
  };

  const getTableLabel = (table: string) => {
    const labels: Record<string, string> = {
      chantiers: "Chantier",
      devis: "Devis",
      factures_fournisseurs: "Facture",
      frais_chantier: "Frais",
      equipe_chantier: "Équipe",
      membres_equipe: "Membre",
    };
    return labels[table] || table;
  };

  return {
    logs,
    loading,
    getActionLabel,
    getTableLabel,
  };
};
