import { addDays, differenceInDays, isWeekend, parseISO } from "date-fns";

/**
 * Jours fériés français (fixes et variables)
 * Note: Pour une vraie app, ces dates devraient être calculées dynamiquement
 * ou récupérées d'une API pour gérer les années futures
 */
export const getFrenchHolidays = (year: number): Date[] => {
  // Jours fériés fixes
  const fixedHolidays = [
    new Date(year, 0, 1),   // Jour de l'an
    new Date(year, 4, 1),   // Fête du travail
    new Date(year, 4, 8),   // Victoire 1945
    new Date(year, 6, 14),  // Fête nationale
    new Date(year, 7, 15),  // Assomption
    new Date(year, 10, 1),  // Toussaint
    new Date(year, 10, 11), // Armistice 1918
    new Date(year, 11, 25), // Noël
  ];

  // Pâques et jours fériés mobiles (calcul de Pâques selon algorithme de Meeus)
  const easter = calculateEaster(year);
  const mobileHolidays = [
    addDays(easter, 1),  // Lundi de Pâques
    addDays(easter, 39), // Ascension
    addDays(easter, 50), // Lundi de Pentecôte
  ];

  return [...fixedHolidays, ...mobileHolidays];
};

/**
 * Calcule la date de Pâques pour une année donnée (algorithme de Meeus)
 */
const calculateEaster = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
};

/**
 * Vérifie si une date est un jour férié français
 */
export const isFrenchHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  const holidays = getFrenchHolidays(year);
  return holidays.some(
    (holiday) =>
      holiday.getDate() === date.getDate() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getFullYear() === date.getFullYear()
  );
};

/**
 * Vérifie si une date est un jour ouvré (ni week-end ni férié)
 */
export const isWorkingDay = (date: Date): boolean => {
  return !isWeekend(date) && !isFrenchHoliday(date);
};

/**
 * Calcule le nombre de jours ouvrés entre deux dates (exclus week-ends et jours fériés)
 * @param startDate Date de début
 * @param endDate Date de fin (défaut: aujourd'hui)
 * @param absences Liste optionnelle de périodes d'absence à exclure
 */
export const calculateWorkingDays = (
  startDate: string | Date,
  endDate: string | Date = new Date(),
  absences: Array<{ date_debut: string; date_fin: string }> = []
): number => {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;

  if (start > end) return 0;

  let workingDays = 0;
  let currentDate = new Date(start);

  // Créer un Set des dates d'absence pour une recherche rapide
  const absenceDates = new Set<string>();
  absences.forEach(({ date_debut, date_fin }) => {
    const absStart = parseISO(date_debut);
    const absEnd = parseISO(date_fin);
    let absDate = new Date(absStart);
    
    while (absDate <= absEnd) {
      absenceDates.add(absDate.toISOString().split('T')[0]);
      absDate = addDays(absDate, 1);
    }
  });

  while (currentDate <= end) {
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Vérifier si c'est un jour ouvré ET pas une absence
    if (isWorkingDay(currentDate) && !absenceDates.has(dateString)) {
      workingDays++;
    }
    
    currentDate = addDays(currentDate, 1);
  }

  return workingDays;
};

/**
 * Calcule le nombre total de jours (calendaires) entre deux dates
 */
export const calculateCalendarDays = (
  startDate: string | Date,
  endDate: string | Date = new Date()
): number => {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;
  
  return Math.max(0, differenceInDays(end, start));
};

/**
 * Estime la date de fin d'un projet basée sur les jours ouvrés restants
 */
export const estimateEndDate = (
  startDate: string | Date,
  workingDaysNeeded: number
): Date => {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  let currentDate = new Date(start);
  let workingDaysCount = 0;

  while (workingDaysCount < workingDaysNeeded) {
    currentDate = addDays(currentDate, 1);
    if (isWorkingDay(currentDate)) {
      workingDaysCount++;
    }
  }

  return currentDate;
};
