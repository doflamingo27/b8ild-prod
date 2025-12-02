// B8ild Content Library - Tous les textes de l'application
// Style: professionnel, clair, rassurant, orienté action
// Couleurs: bleu #1C3F60, jaune #F7B500, gris #2B2B2B

export const labels = {
  app: {
    name: "B8ild",
    moduleTender: "B8uild Tender"
  },
  actions: {
    save: "Enregistrer",
    cancel: "Annuler",
    close: "Fermer",
    confirm: "Confirmer",
    back: "Retour",
    next: "Suivant",
    create: "Créer",
    edit: "Modifier",
    delete: "Supprimer",
    viewDetails: "Voir détails",
    tryFree: "Essayer gratuitement 7 jours",
    startDemo: "Voir une démo",
    add: "Ajouter",
    upload: "Téléverser",
    import: "Importer",
    export: "Exporter",
    download: "Télécharger",
    assign: "Affecter",
    markDone: "Marquer comme fait",
    proceedToPayment: "Passer au paiement",
    upgradePlan: "Mettre à niveau",
    convertToAO: "Convertir en AO",
    launchAssistant: "Lancer l'assistant",
    activateWatch: "Activer la veille",
    regenerate: "Régénérer",
    refresh: "Rafraîchir"
  },
  nav: {
    dashboard: "Tableau de bord",
    team: "Équipe",
    projects: "Chantiers",
    reports: "Rapports",
    profile: "Profil entreprise",
    billing: "Mon abonnement",
    tenders: "Appels d'offres",
    tendersProfile: "Profil AO",
    tendersDashboard: "Dashboard AO",
    tendersCatalog: "Catalogue AO",
    tendersImport: "Importer AO",
    tendersInbox: "Boîte de réception AO",
    templates: "Templates"
  },
  forms: {
    companyName: "Nom de l'entreprise",
    siret: "SIRET",
    specialty: "Spécialité métier",
    address: "Adresse",
    projectName: "Nom du chantier",
    projectClient: "Client",
    projectAddress: "Adresse du chantier",
    projectDuration: "Durée estimée (jours)",
    projectDescription: "Description",
    memberFirstname: "Prénom",
    memberLastname: "Nom",
    memberRole: "Poste",
    memberSkill: "Spécialité",
    hourlyRate: "Taux horaire (€/h)",
    employeeCharges: "Charges salariales (%)",
    employerCharges: "Charges patronales (%)",
    active: "Actif",
    tenderTitle: "Titre AO",
    tenderBuyer: "Organisme acheteur",
    tenderCity: "Ville",
    tenderCP: "Code postal",
    tenderBudgetMin: "Budget min (€)",
    tenderBudgetMax: "Budget max (€)",
    tenderDeadline: "Date limite",
    tenderCategory: "Catégorie BTP",
    tenderProcedure: "Procédure",
    tenderType: "Type de marché",
    tenderDocs: "Documents obligatoires",
    tenderFile: "Fichier AO / DCE",
    uploadHere: "Déposer votre fichier ici",
    profileAO_Specialties: "Spécialités",
    profileAO_Area: "Zone d'intervention",
    profileAO_FranceAll: "France entière",
    profileAO_Departments: "Départements",
    profileAO_RadiusKm: "Rayon (km)",
    profileAO_BudgetMin: "Budget minimum (€)",
    profileAO_BudgetMax: "Budget maximum (€)",
    profileAO_Certifications: "Certifications",
    profileAO_AlertsEmail: "Alertes par e-mail",
    profileAO_AlertsPush: "Notifications in-app",
    profileAO_Frequency: "Fréquence des alertes",
    profileAO_Threshold: "Seuil de score (0-100)"
  }
};

export const placeholders = {
  generic: {
    search: "Rechercher…",
    select: "Sélectionner…"
  },
  company: {
    name: "Ex : Dupont Rénovation",
    siret: "Ex : 123 456 789 00012",
    specialty: "Ex : Plomberie",
    address: "Ex : 2 Rue du Bâtiment, 75001 Paris"
  },
  project: {
    name: "Ex : Rénovation immeuble Montreuil",
    client: "Ex : Syndic Montreuil",
    address: "Ex : 45 Rue Jean Jaurès, 93100 Montreuil",
    duration: "Ex : 15"
  },
  team: {
    firstname: "Ex : Jean",
    lastname: "Ex : Dupont",
    role: "Ex : Chef de chantier",
    skill: "Ex : Électricité",
    rate: "Ex : 42"
  },
  tender: {
    title: "Ex : Rénovation thermique école primaire",
    buyer: "Ex : Ville de Lyon",
    city: "Ex : Lyon",
    cp: "Ex : 69000",
    budgetMin: "Ex : 50 000",
    budgetMax: "Ex : 350 000"
  },
  aoProfile: {
    specialties: "Ex : Électricité, Plomberie",
    departments: "Ex : 75, 92, 93",
    radius: "Ex : 50",
    certifications: "Ex : RGE, Qualibat 5421"
  }
};

export const tooltips = {
  kpiRentability: "Moyenne de rentabilité de vos chantiers actifs.",
  kpiTeamCost: "Somme journalière des coûts de l'équipe active.",
  projectCriticalDay: "Jour où le chantier bascule en déficit au rythme actuel.",
  aoScore: "Score de compatibilité basé sur spécialités, zone, budget, certifs et délais.",
  aoThreshold: "Score minimum pour déclencher une alerte.",
  uploadOCR: "Nous extrayons automatiquement les montants, dates et mots-clés du PDF.",
  franceAll: "Cochez pour recevoir des AO de toute la France.",
  quotas: "Limites selon votre plan. Mettez à niveau pour débloquer plus."
};

export const validation = {
  required: "Champ requis.",
  invalidEmail: "Adresse e-mail invalide.",
  invalidNumber: "Valeur numérique invalide.",
  invalidSiret: "SIRET invalide.",
  invalidCP: "Code postal invalide.",
  dateInPast: "La date ne peut pas être antérieure à aujourd'hui.",
  minMax: "La valeur min ne peut pas dépasser la valeur max."
};

export const toasts = {
  saved: "Enregistré avec succès.",
  created: "Créé avec succès.",
  updated: "Mise à jour effectuée.",
  deleted: "Supprimé définitivement.",
  deactivated: "Désactivé.",
  reactivated: "Réactivé.",
  uploaded: "Fichier téléversé.",
  imported: "Import terminé.",
  exportReady: "Export prêt.",
  aoConverted: "Appel d'offres créé depuis l'e-mail.",
  errorGeneric: "Une erreur s'est produite. Réessayez.",
  errorQuota: "Quota atteint avec votre plan actuel.",
  error404: "Ressource introuvable.",
  billingRequired: "Action réservée : mettez à niveau votre abonnement."
};

export const modals = {
  deleteConfirm: {
    title: "Supprimer définitivement ?",
    body: "Cette action est irréversible. Voulez-vous continuer ?",
    confirm: "Oui, supprimer",
    cancel: "Annuler"
  },
  upgradeNeeded: {
    title: "Fonction réservée",
    body: "Cette fonctionnalité est disponible avec le plan supérieur.",
    confirm: "Voir les plans",
    cancel: "Plus tard"
  },
  leaveUnsaved: {
    title: "Modifications non enregistrées",
    body: "Vous avez des changements en cours. Quitter sans enregistrer ?",
    confirm: "Quitter",
    cancel: "Rester"
  }
};

export const emptyStates = {
  dashboard: {
    title: "Bienvenue sur B8ild",
    text: "Créez votre premier chantier et ajoutez votre équipe pour suivre la rentabilité en temps réel.",
    primary: "Créer un chantier",
    secondary: "Ajouter un membre"
  },
  projects: {
    title: "Aucun chantier pour le moment",
    text: "Créez un chantier pour démarrer le suivi des coûts, des marges et des jours critiques.",
    primary: "Nouveau chantier"
  },
  team: {
    title: "Aucun membre dans l'équipe",
    text: "Ajoutez vos collaborateurs pour calculer les coûts journaliers réels.",
    primary: "Ajouter un membre"
  },
  reports: {
    title: "Aucun rapport",
    text: "Générez des rapports PDF ou CSV depuis vos chantiers.",
    primary: "Aller aux chantiers"
  },
  templates: {
    title: "Aucun template pour le moment",
    text: "Créez des templates pour accélérer la création de vos chantiers récurrents.",
    primary: "Créer un template"
  },
  tendersDashboard: {
    title: "Activez votre veille",
    text: "Configurez votre profil AO pour recevoir des alertes ciblées.",
    primary: "Configurer mon profil AO",
    secondary: "Importer un AO manuellement"
  },
  tendersCatalog: {
    title: "Aucun appel d'offres trouvé",
    text: "Ajustez vos filtres ou importez un AO (PDF/CSV).",
    primary: "Importer AO"
  },
  tendersImport: {
    title: "Importez votre premier AO",
    text: "Glissez-déposez un PDF/ZIP/CSV pour lancer l'analyse automatique.",
    primary: "Importer AO"
  },
  tendersInbox: {
    title: "Boîte de réception vide",
    text: "Transférez vos e-mails d'AO vers l'adresse de collecte dédiée.",
    primary: "Voir mon adresse de collecte"
  }
};

export const tables = {
  projects: {
    columns: ["Chantier", "Client", "Adresse", "Durée (j)", "Marge %", "Jour critique", "Actions"]
  },
  team: {
    columns: ["Nom", "Poste", "Spécialité", "Taux (€/h)", "Charges", "Coût/jour", "Statut", "Actions"]
  },
  tenders: {
    filters: ["Mot-clé", "Département", "Budget min", "Budget max", "Deadline", "Pertinence"],
    columns: ["Titre", "Acheteur", "Ville", "Budget estimé", "Deadline", "Score", "Pertinence", "Actions"]
  },
  matches: {
    columns: ["Titre AO", "Ville", "Budget", "Deadline", "Score", "Pourquoi ça matche", "Actions"]
  }
};

export const microcopy = {
  heroTitle: "Pilotez la rentabilité de vos chantiers en temps réel.",
  heroSubtitle: "B8ild, logiciel 100% dédié aux artisans et PME du BTP, calcule automatiquement le jour où votre chantier devient déficitaire. Anticipez, maîtrisez, gagnez.",
  whyChoose: [
    "Rentabilité temps réel",
    "Alertes automatiques avant déficit",
    "Intégration complète des coûts",
    "Interface simple, pensée pour le terrain"
  ],
  tenderHeroTitle: "B8uild Tender — la veille AO qui trouve les bons marchés pour vous",
  tenderHeroSubtitle: "Import, matching et assistant candidature guidé, sans complexité."
};

export const emails = {
  welcome: {
    subject: "Bienvenue sur B8ild — Configurez votre première équipe",
    html: `<div style='font-family:Inter,Arial,sans-serif;color:#2B2B2B'>
      <h2 style='color:#1C3F60'>Bienvenue sur B8ild 👷‍♂️</h2>
      <p>Merci de votre inscription. Commencez en 3 étapes :</p>
      <ol>
        <li>Ajoutez votre <strong>profil entreprise</strong></li>
        <li>Créez votre <strong>équipe</strong></li>
        <li>Lancez votre <strong>premier chantier</strong></li>
      </ol>
      <p><a href='{{app_url}}' style='background:#F7B500;color:#2B2B2B;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600'>Aller au Tableau de bord</a></p>
      <hr/>
      <p style='font-size:12px;color:#666'>© B8ild</p>
    </div>`
  },
  trialEnding: {
    subject: "Votre essai B8ild se termine bientôt",
    html: `<div style='font-family:Inter,Arial'>
      <h2 style='color:#1C3F60'>Votre essai se termine bientôt</h2>
      <p>Pour continuer à suivre vos marges et recevoir vos alertes, passez au plan Pro.</p>
      <p><a href='{{billing_url}}' style='background:#F7B500;color:#2B2B2B;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600'>Mettre à niveau</a></p>
    </div>`
  },
  tenderAlertRealtime: {
    subject: "🎯 Nouvel AO {{score}}% — {{ville}} (deadline {{deadline}})",
    html: `<div style='font-family:Inter,Arial;color:#2B2B2B'>
      <h2 style='color:#1C3F60'>Nouvel Appel d'Offres BTP</h2>
      <p><strong>{{titre}}</strong></p>
      <ul>
        <li>Organisme : {{organisme}}</li>
        <li>Localisation : {{ville}} ({{departement}})</li>
        <li>Montant estimé : {{montant_estime}} €</li>
        <li>Date limite : {{deadline}}</li>
        <li>Compatibilité : <strong>{{score}}%</strong></li>
      </ul>
      <p>Critères qui matchent :</p>
      <ul>
        {{#each criteres_ok}}
        <li>✅ {{this}}</li>
        {{/each}}
      </ul>
      <p><a href='{{ao_link}}' style='background:#F7B500;color:#2B2B2B;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600'>Voir l'AO</a></p>
      <hr/>
      <p style='font-size:12px;color:#666'>Gérez vos préférences d'alertes dans Profil AO.</p>
    </div>`
  },
  tenderDigestDaily: {
    subject: "Résumé quotidien — Appels d'offres pertinents",
    html: `<div style='font-family:Inter,Arial'>
      <h2 style='color:#1C3F60'>Vos AO du jour</h2>
      {{#if items.length}}
      <ul>
        {{#each items}}
        <li><strong>{{titre}}</strong> — {{ville}} — Score {{score}}% — deadline {{deadline}} — <a href='{{ao_link}}'>Voir</a></li>
        {{/each}}
      </ul>
      {{else}}
      <p>Aucun AO pertinent aujourd'hui selon votre profil.</p>
      {{/if}}
      <p><a href='{{catalog_link}}' style='background:#F7B500;color:#2B2B2B;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600'>Ouvrir le catalogue</a></p>
    </div>`
  },
  tenderGuideReady: {
    subject: "Votre guide de candidature est prêt — {{titre}}",
    html: `<div style='font-family:Inter,Arial'>
      <h2 style='color:#1C3F60'>Assistant candidature prêt</h2>
      <p>Le guide IA pour l'AO <strong>{{titre}}</strong> est disponible.</p>
      <p><a href='{{assistant_link}}' style='background:#F7B500;color:#2B2B2B;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600'>Ouvrir l'assistant</a></p>
    </div>`
  }
};

export const inApp = {
  bellEmpty: "Aucune notification pour le moment.",
  types: {
    tender: "Nouvel appel d'offres compatible",
    alert: "Alerte rentabilité chantier",
    system: "Information système"
  },
  sampleItem: "🎯 AO {{score}}% — {{titre}} (deadline {{deadline}})"
};
