// src/constants/unlocks.js
import { AI_TASKS } from "./aiTasks";

// The dashboard unlock thresholds come from ai_tasks.json via AI_TASKS.
// This keeps the "Wussten Sie?" bands aligned with the real 6 dashboard levels.
export const UNLOCKS = AI_TASKS.map((task) => ({
  label: task.shortLabel,
  threshold: task.threshold,
}));

export const countUnlocked = (energy) =>
  UNLOCKS.filter((u) => Number(energy) >= Number(u.threshold)).length;

// New 6-band model for the 6-level dashboard:
//
// Band 0: before Level 1
// Band 1: Level 1 -> Level 2
// Band 2: Level 2 -> Level 3
// Band 3: Level 3 -> Level 4
// Band 4: Level 4 -> Level 5
// Band 5: Level 5 -> Level 6
export const ENERGY_BANDS = [
  { min: 0,                    max: UNLOCKS[0]?.threshold ?? 0.0017 },
  { min: UNLOCKS[0]?.threshold ?? 0.0017, max: UNLOCKS[1]?.threshold ?? 0.003 },
  { min: UNLOCKS[1]?.threshold ?? 0.003,  max: UNLOCKS[2]?.threshold ?? 0.0045 },
  { min: UNLOCKS[2]?.threshold ?? 0.0045, max: UNLOCKS[3]?.threshold ?? 0.006 },
  { min: UNLOCKS[3]?.threshold ?? 0.006,  max: UNLOCKS[4]?.threshold ?? 0.01 },
  { min: UNLOCKS[4]?.threshold ?? 0.01,   max: UNLOCKS[5]?.threshold ?? 0.5 },
];

// Fisher-Yates shuffle
export const shuffleArray = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Returns a shuffled copy of the full band message map
export const getShuffledBandMessages = () => {
  const shuffled = {};
  Object.entries(BAND_MESSAGES).forEach(([band, messages]) => {
    shuffled[band] = shuffleArray(messages);
  });
  return shuffled;
};

// Energy-based "Wussten Sie?" messages for the new 6-level dashboard.
export const BAND_MESSAGES = {
  0: [
    "Wussten Sie? Auch ein Computer braucht Energie, bevor eine KI überhaupt antworten kann — zum Rechnen, Speichern und Anzeigen.",
    "Wussten Sie? Eine Kilowattstunde klingt abstrakt: 0,001 kWh ist ein sehr kleiner Teil davon, aber viele kleine Rechenschritte summieren sich.",
    "Wussten Sie? KI wirkt unsichtbar, läuft aber auf echten Computern in Rechenzentren.",
    "Wussten Sie? Jedes digitale Gerät wandelt Strom in Wärme um — auch Smartphones, Laptops und Server.",
    "Wussten Sie? Eine KI-Antwort entsteht nicht magisch: Viele Zahlen werden sehr schnell miteinander verrechnet.",
    "Wussten Sie? Je größer eine KI-Aufgabe ist, desto mehr Rechenschritte können nötig sein.",
    "Wussten Sie? Schon beim Einschalten eines Computers beginnt Energieverbrauch — noch bevor man etwas fragt.",
    "Wussten Sie? Daten reisen durch Kabel, Funknetze und Server — auch dieser Weg braucht Energie.",
    "Wussten Sie? Kurze digitale Aufgaben können klein wirken, aber Millionen davon machen einen großen Unterschied.",
    "Wussten Sie? Energiesparen bei digitaler Technik beginnt oft mit einfachen Fragen: Muss etwas neu berechnet werden oder ist es schon gespeichert?"
  ],

  1: [
    "Wussten Sie? Eine Suchmaschine durchsucht nicht live das ganze Internet, sondern nutzt riesige vorberechnete Verzeichnisse.",
    "Wussten Sie? Bei einer Websuche arbeiten viele Computer zusammen: Sie sortieren, vergleichen und bewerten Ergebnisse.",
    "Wussten Sie? Auch eine einfache Suchanfrage braucht Energie — besonders, wenn sehr viele Menschen gleichzeitig suchen.",
    "Wussten Sie? Suchmaschinen speichern häufig genutzte Ergebnisse zwischen, damit sie nicht jedes Mal neu berechnet werden müssen.",
    "Wussten Sie? Ein guter Suchbegriff spart Zeit und Energie, weil weniger unnötige Ergebnisse durchsucht werden müssen.",
    "Wussten Sie? Früher suchte man im Lexikon, heute in Sekunden im Netz — dafür arbeiten im Hintergrund große Server.",
    "Wussten Sie? Nicht jede digitale Aufgabe ist KI: Eine normale Suche und eine KI-Antwort funktionieren unterschiedlich.",
    "Wussten Sie? Bei einer Suche geht es oft um Finden; bei generativer KI geht es zusätzlich um neues Formulieren.",
    "Wussten Sie? Je genauer eine Frage gestellt wird, desto weniger digitale Umwege sind oft nötig.",
    "Wussten Sie? Auch Internetseiten, Bilder und Werbung, die neben Suchergebnissen geladen werden, verbrauchen zusätzliche Energie."
  ],

  2: [
    "Wussten Sie? Übersetzungs-KI zerlegt Sätze nicht Wort für Wort, sondern erkennt Muster im Zusammenhang.",
    "Wussten Sie? Ein Wort kann je nach Satz etwas anderes bedeuten — genau deshalb ist Übersetzen für Computer spannend.",
    "Wussten Sie? Moderne Übersetzungsprogramme wurden mit sehr vielen Beispieltexten trainiert.",
    "Wussten Sie? KI kann beim Übersetzen helfen, aber Menschen prüfen oft besser, ob Ton, Humor und Kultur passen.",
    "Wussten Sie? Kurze Texte sind meistens leichter zu übersetzen als lange Texte mit Fachwörtern oder Redewendungen.",
    "Wussten Sie? Manche Wörter gibt es in einer Sprache gar nicht genau gleich — KI muss dann eine passende Umschreibung finden.",
    "Wussten Sie? Übersetzung ist mehr als Wörtertausch: Grammatik, Reihenfolge und Bedeutung müssen zusammenpassen.",
    "Wussten Sie? Für Kinder kann KI beim Sprachenlernen helfen, zum Beispiel mit Beispielsätzen oder Aussprachehilfen.",
    "Wussten Sie? Ältere Texte, Dialekte und Umgangssprache können für Übersetzungs-KI besonders schwierig sein.",
    "Wussten Sie? Wenn eine KI unsicher ist, klingt die Antwort manchmal trotzdem sehr sicher — deshalb lohnt sich Nachfragen."
  ],

  3: [
    "Wussten Sie? Chatbots berechnen Wort für Wort, welche Fortsetzung wahrscheinlich gut passt.",
    "Wussten Sie? Eine KI versteht Sprache anders als ein Mensch: Sie arbeitet mit Mustern, Wahrscheinlichkeiten und Zahlen.",
    "Wussten Sie? Gute Fragen helfen der KI: Je klarer die Aufgabe, desto hilfreicher ist oft die Antwort.",
    "Wussten Sie? KI kann erklären, zusammenfassen und Ideen sammeln — aber sie kann sich auch irren.",
    "Wussten Sie? Eine KI-Antwort sollte man besonders bei Medizin, Recht oder Geldfragen immer kritisch prüfen.",
    "Wussten Sie? ChatGPT erzeugt neue Sätze, statt einfach nur eine Internetseite zu öffnen.",
    "Wussten Sie? KI kann beim Lernen helfen, wenn man sie bittet, Schritt für Schritt und einfach zu erklären.",
    "Wussten Sie? Für Museen kann KI Texte in verschiedenen Schwierigkeitsstufen erklären — für Kinder, Erwachsene oder Fachleute.",
    "Wussten Sie? Wenn zwei Personen dieselbe Frage etwas anders stellen, kann die KI unterschiedliche Antworten geben.",
    "Wussten Sie? KI ist besonders nützlich als Denkpartner — die Verantwortung für die Entscheidung bleibt aber beim Menschen."
  ],

  4: [
    "Wussten Sie? Eine Bild-KI erzeugt ein Bild Schritt für Schritt aus vielen berechneten Mustern.",
    "Wussten Sie? Ein KI-Bild ist nicht einfach ein Foto aus dem Internet, sondern wird neu zusammengesetzt.",
    "Wussten Sie? Bild-KI braucht meist mehr Rechenleistung als eine kurze Textantwort.",
    "Wussten Sie? Je genauer die Bildbeschreibung ist, desto besser kann die KI die gewünschte Szene treffen.",
    "Wussten Sie? KI-Bilder können überzeugend aussehen und trotzdem Fehler enthalten — zum Beispiel bei Händen, Schrift oder Details.",
    "Wussten Sie? Ein Bild in hoher Auflösung braucht mehr Speicher und oft mehr Rechenarbeit.",
    "Wussten Sie? KI kann Fantasiewelten erzeugen, aber sie kennt keine echte Kamera und keinen echten Moment.",
    "Wussten Sie? Bei KI-Bildern ist Transparenz wichtig: Menschen sollten wissen, ob ein Bild künstlich erzeugt wurde.",
    "Wussten Sie? Künstlerinnen und Künstler nutzen KI manchmal als Werkzeug für Skizzen, Ideen oder Experimente.",
    "Wussten Sie? Ein gutes KI-Bild entsteht oft nicht beim ersten Versuch — häufig wird die Beschreibung mehrfach verbessert."
  ],

  5: [
    "Wussten Sie? KI-Video ist besonders rechenintensiv, weil nicht nur ein Bild, sondern viele Bilder hintereinander entstehen.",
    "Wussten Sie? Ein kurzes Video besteht aus vielen Einzelbildern — bei 5 Sekunden können das weit über 100 Bilder sein.",
    "Wussten Sie? Bei KI-Videos muss die KI zusätzlich darauf achten, dass Bewegungen von Bild zu Bild zusammenpassen.",
    "Wussten Sie? Ein KI-Video braucht oft deutlich mehr Rechenarbeit als ein einzelnes KI-Bild.",
    "Wussten Sie? In Videos sind Fehler besonders sichtbar, weil sich Gesichter, Hände oder Gegenstände über mehrere Bilder verändern.",
    "Wussten Sie? Je länger ein KI-Video ist, desto schwieriger wird es, Figuren, Farben und Bewegungen stabil zu halten.",
    "Wussten Sie? Viele KI-Videos werden mehrfach erzeugt, bis ein Ergebnis wirklich passt — jeder Versuch braucht zusätzliche Energie.",
    "Wussten Sie? Video-KI verbindet mehrere Herausforderungen: Sprache verstehen, Bilder erzeugen und Bewegung berechnen.",
    "Wussten Sie? Für Film, Bildung und Museen kann KI-Video neue Ideen zeigen — aber es braucht klare Regeln und Verantwortung.",
    "Wussten Sie? Ein KI-Video kann beeindruckend wirken, obwohl es keine echte Kamera, keinen echten Ort und keine echte Szene gab.",
    "Wussten Sie? Rechenzentren müssen nicht nur Server betreiben, sondern oft auch Wärme abführen — Kühlung ist Teil des Energiebedarfs.",
    "Wussten Sie? Effizientere Chips, bessere Software und erneuerbare Energie können den Fußabdruck von KI-Anwendungen verringern.",
    "Wussten Sie? Manchmal ist die sparsamste KI-Anfrage die, die man gut vorbereitet: klar, kurz und mit genauem Ziel.",
    "Wussten Sie? Nicht jede Aufgabe braucht die größte KI — kleinere Modelle können für einfache Aufgaben oft ausreichen.",
    "Wussten Sie? Digital nachhaltig zu handeln heißt nicht, KI nie zu nutzen, sondern sie bewusst und passend einzusetzen."
  ],
};