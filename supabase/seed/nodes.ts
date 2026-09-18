/**
 * The 18 stations named in the product spec. Coordinates are approximate
 * (based on public knowledge of Baku Metro station locations) and should be
 * verified/corrected by the team against an authoritative source before
 * relying on them for anything beyond map placement. All are real Baku
 * Metro stations — no bus routes or connections between them are implied
 * or seeded here (see routes.ts for why).
 */
export const SEED_NODES = [
  { nameAz: "Dərnəgül", nameRu: "Дарнагюль", slug: "darnagul", lat: 40.411, lon: 49.889 },
  { nameAz: "Azadlıq Prospekti", nameRu: "Проспект Азадлыг", slug: "azadliq-prospekti", lat: 40.4227, lon: 49.8574 },
  { nameAz: "Nəsimi", nameRu: "Насими", slug: "nasimi", lat: 40.4025, lon: 49.839 },
  { nameAz: "Memar Əcəmi", nameRu: "Мемар Аджеми", slug: "memar-acami", lat: 40.3898, lon: 49.8434 },
  { nameAz: "20 Yanvar", nameRu: "20 Января", slug: "20-yanvar", lat: 40.3844, lon: 49.8483 },
  { nameAz: "İnşaatçılar", nameRu: "Иншаатчылар", slug: "insaatcilar", lat: 40.3985, lon: 49.8163 },
  { nameAz: "Elmlər Akademiyası", nameRu: "Элмляр Академиясы", slug: "elmlar-akademiyasi", lat: 40.3766, lon: 49.839 },
  { nameAz: "Nizami", nameRu: "Низами", slug: "nizami", lat: 40.3754, lon: 49.8412 },
  { nameAz: "28 May", nameRu: "28 Мая", slug: "28-may", lat: 40.3725, lon: 49.8442 },
  { nameAz: "Gənclik", nameRu: "Гянджлик", slug: "genclik", lat: 40.3898, lon: 49.8309 },
  { nameAz: "Nəriman Nərimanov", nameRu: "Нариман Нариманов", slug: "nariman-narimanov", lat: 40.4001, lon: 49.8654 },
  { nameAz: "Ulduz", nameRu: "Улдуз", slug: "ulduz", lat: 40.4292, lon: 49.8271 },
  { nameAz: "Koroğlu", nameRu: "Кёроглу", slug: "koroglu", lat: 40.4436, lon: 49.8127 },
  { nameAz: "Qara Qarayev", nameRu: "Гара Гараев", slug: "qara-qarayev", lat: 40.3707, lon: 49.8005 },
  { nameAz: "Neftçilər", nameRu: "Нефтчиляр", slug: "neftcilar", lat: 40.3961, lon: 49.9106 },
  { nameAz: "Xalqlar Dostluğu", nameRu: "Хагляр Достлугу", slug: "xalqlar-dostlugu", lat: 40.431, lon: 49.9291 },
  { nameAz: "Əhmədli", nameRu: "Ахмедли", slug: "ahmadli", lat: 40.3762, lon: 49.9407 },
  { nameAz: "Həzi Aslanov", nameRu: "Гази Асланов", slug: "hazi-aslanov", lat: 40.3679, lon: 49.9294 },
] as const;
