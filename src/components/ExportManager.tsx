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
      console.log('[PDF Export] Début de l\'export PDF');
      
      // Import dynamique des librairies
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');
      console.log('[PDF Export] Librairies chargées');
      
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
      doc.text(`Nom: ${chantierData.nom_chantier || 'N/A'}`, 20, 50);
      doc.text(`Client: ${chantierData.client || 'N/A'}`, 20, 58);
      doc.text(`Adresse: ${chantierData.adresse || "Non renseignée"}`, 20, 66);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 74);
      
      console.log('[PDF Export] En-tête créé');
      
      // Finances
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.text("Finances", 20, 90);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      const budgetHT = Number(devis?.montant_ht || 0);
      const budgetTTC = Number(devis?.montant_ttc || 0);
      const coutJournalier = Number(calculations?.cout_journalier_equipe || 0);
      const budgetDispo = Number(calculations?.budget_disponible || 0);
      const rentabilite = Number(calculations?.rentabilite_pct || 0);
      const jourCrit = calculations?.jour_critique;
      
      doc.text(`Budget devis HT: ${budgetHT.toFixed(2)} €`, 20, 100);
      doc.text(`Budget devis TTC: ${budgetTTC.toFixed(2)} €`, 20, 108);
      doc.text(`Coût journalier équipe: ${coutJournalier.toFixed(2)} €`, 20, 116);
      doc.text(`Budget disponible: ${budgetDispo.toFixed(2)} €`, 20, 124);
      doc.text(`Rentabilité: ${rentabilite.toFixed(2)} %`, 20, 132);
      doc.text(`Jour critique: ${isFinite(jourCrit) && jourCrit !== null ? Number(jourCrit).toFixed(2) : 'N/A'}`, 20, 140);
      
      console.log('[PDF Export] Section finances créée');
      
      // Équipe (tableau)
      const equipeData = (membres || []).map(m => {
        try {
          const cout = calculations?.calculerCoutJournalierMembre ? 
            calculations.calculerCoutJournalierMembre(m) || 0 : 0;
          return [
            `${m?.prenom || ''} ${m?.nom || ''}`.trim() || 'N/A',
            m?.poste || 'Non renseigné',
            `${Number(cout).toFixed(2)} €`
          ];
        } catch (err) {
          console.error('[PDF Export] Erreur calcul membre:', err, m);
          return [
            `${m?.prenom || ''} ${m?.nom || ''}`.trim() || 'N/A',
            m?.poste || 'Non renseigné',
            '0.00 €'
          ];
        }
      });
      
      if (equipeData.length > 0) {
        (doc as any).autoTable({
          head: [['Nom', 'Poste', 'Coût journalier']],
          body: equipeData,
          startY: 155,
          theme: 'grid',
          headStyles: { fillColor: [234, 88, 12] },
          styles: { fontSize: 10 },
        });
        console.log('[PDF Export] Tableau équipe créé');
      }
      
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
      
      const facturesData = (factures || []).map(f => {
        const montantHT = Number(f?.montant_ht || 0);
        return [
          f?.fournisseur || "Non renseigné",
          f?.categorie || "Autres",
          `${montantHT.toFixed(2)} €`,
          f?.date_facture || "Non renseignée"
        ];
      });
      
      if (facturesData.length > 0) {
        (doc as any).autoTable({
          head: [['Fournisseur', 'Catégorie', 'Montant HT', 'Date']],
          body: facturesData,
          startY: finalY > 200 ? 30 : finalY + 20,
          theme: 'grid',
          headStyles: { fillColor: [234, 88, 12] },
          styles: { fontSize: 10 },
        });
        console.log('[PDF Export] Tableau factures créé');
      }
      
      // Nettoyer le nom du fichier
      const cleanName = (chantierData.nom_chantier || 'chantier')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      const fileName = `chantier_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Télécharger
      doc.save(fileName);
      console.log('[PDF Export] PDF téléchargé:', fileName);
      
      toast({
        title: "Export PDF réussi",
        description: "Le fichier a été téléchargé",
      });
    } catch (error) {
      console.error('[PDF Export] Erreur complète:', error);
      toast({
        title: "Erreur d'export",
        description: error instanceof Error ? error.message : "Impossible d'exporter en PDF",
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
