import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportManagerProps {
  chantierId: string;
  chantierData: any;
  membres: any[];
  devis?: any;
  factures: any[];
  frais: any[];
  calculations: any;
}

const ExportManager = ({
  chantierId,
  chantierData,
  membres,
  devis,
  factures,
  frais,
  calculations,
}: ExportManagerProps) => {
  const { toast } = useToast();

  const exportToCSV = () => {
    try {
      const csvData = [
        ["B8ild - Rapport de Chantier"],
        [""],
        ["Informations générales"],
        ["Nom du chantier", chantierData.nom_chantier],
        ["Client", chantierData.client],
        ["Adresse", chantierData.adresse || "Non renseignée"],
        [""],
        ["Finances"],
        ["Budget devis HT", (devis?.montant_ht || 0).toFixed(2)],
        ["Budget devis TTC", (devis?.montant_ttc || 0).toFixed(2)],
        ["Coût journalier équipe", (calculations.cout_journalier_equipe || 0).toFixed(2)],
        ["Budget disponible", (calculations.budget_disponible || 0).toFixed(2)],
        ["Rentabilité (%)", (calculations.rentabilite_pct || 0).toFixed(2)],
        ["Jour critique", isFinite(calculations.jour_critique) ? calculations.jour_critique.toFixed(2) : 'N/A'],
        ["Jours restants avant déficit", calculations.jours_restants_avant_deficit || 0],
        [""],
        ["Équipe"],
        ["Nom", "Poste", "Coût journalier"],
        ...membres.map(m => {
          const cout = calculations.calculerCoutJournalierMembre(m) || 0;
          return [
            `${m.prenom} ${m.nom}`,
            m.poste,
            cout.toFixed(2)
          ];
        }),
        [""],
        ["Factures fournisseurs"],
        ["Fournisseur", "Catégorie", "Montant HT", "Date"],
        ...factures.map(f => [
          f.fournisseur || "Non renseigné",
          f.categorie,
          (f.montant_ht || 0).toFixed(2),
          f.date_facture || "Non renseignée"
        ]),
      ];

      const csvContent = csvData.map(row => row.join(";")).join("\n");
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `chantier_${chantierData.nom_chantier}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: "Export CSV réussi",
        description: "Le fichier a été téléchargé",
      });
    } catch (error) {
      console.error('Erreur export CSV:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter en CSV",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    // Pour Excel, on utilise le même format CSV qui sera interprété par Excel
    exportToCSV();
    toast({
      title: "Export Excel",
      description: "Fichier CSV compatible Excel téléchargé",
    });
  };

  const exportToPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      // En-tête avec logo B8ild
      doc.setFontSize(24);
      doc.setTextColor(234, 88, 12); // Orange B8ild
      doc.text("B8ild", 20, 20);
      
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text("Rapport de Chantier", 20, 35);
      
      // Informations générales
      doc.setFontSize(12);
      doc.text(`Nom: ${chantierData.nom_chantier}`, 20, 50);
      doc.text(`Client: ${chantierData.client}`, 20, 58);
      doc.text(`Adresse: ${chantierData.adresse || "Non renseignée"}`, 20, 66);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 74);
      
      // Finances
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.text("Finances", 20, 90);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Budget devis HT: ${(devis?.montant_ht || 0).toFixed(2)} €`, 20, 100);
      doc.text(`Budget devis TTC: ${(devis?.montant_ttc || 0).toFixed(2)} €`, 20, 108);
      doc.text(`Coût journalier équipe: ${(calculations.cout_journalier_equipe || 0).toFixed(2)} €`, 20, 116);
      doc.text(`Budget disponible: ${(calculations.budget_disponible || 0).toFixed(2)} €`, 20, 124);
      doc.text(`Rentabilité: ${(calculations.rentabilite_pct || 0).toFixed(2)} %`, 20, 132);
      const jourCritique = isFinite(calculations.jour_critique) ? calculations.jour_critique.toFixed(2) : 'N/A';
      doc.text(`Jour critique: ${jourCritique}`, 20, 140);
      
      // Équipe (tableau)
      const equipeData = membres.map(m => {
        const cout = calculations.calculerCoutJournalierMembre(m) || 0;
        return [
          `${m.prenom || ''} ${m.nom || ''}`,
          m.poste || 'Non renseigné',
          `${cout.toFixed(2)} €`
        ];
      });
      
      (doc as any).autoTable({
        head: [['Nom', 'Poste', 'Coût journalier']],
        body: equipeData,
        startY: 155,
        theme: 'grid',
        headStyles: { fillColor: [234, 88, 12] },
      });
      
      // Factures (nouvelle page si nécessaire)
      const finalY = (doc as any).lastAutoTable?.finalY || 155;
      if (finalY > 200) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(234, 88, 12);
        doc.text("Factures fournisseurs", 20, 20);
      } else {
        doc.setFontSize(14);
        doc.setTextColor(234, 88, 12);
        doc.text("Factures fournisseurs", 20, finalY + 15);
      }
      
      const facturesData = factures.map(f => [
        f.fournisseur || "Non renseigné",
        f.categorie || "Autres",
        `${f.montant_ht ?? 0} €`,
        f.date_facture || "Non renseignée"
      ]);
      
      (doc as any).autoTable({
        head: [['Fournisseur', 'Catégorie', 'Montant HT', 'Date']],
        body: facturesData,
        startY: finalY > 200 ? 30 : finalY + 20,
        theme: 'grid',
        headStyles: { fillColor: [234, 88, 12] },
      });
      
      // Télécharger
      doc.save(`chantier_${chantierData.nom_chantier}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Export PDF réussi",
        description: "Le fichier a été téléchargé",
      });
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter en PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportManager;
