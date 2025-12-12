/**
 * Typdefinition für ein einzelnes Todo-Item.
 * Entspricht der Struktur, die das Backend (Mongoose) liefert.
 */

export interface Todo {
  /** Die eindeutige ID (vom Backend/MongoDB generiert) */
  _id: string;

  /** Titel der Aufgabe */
  title: string;

  /** Beschreibung der Aufgabe */
  description: string;

  /** Status – ob das Todo erledigt ist */
  completed: boolean;

  /** Zeitstempel, wann das Todo erstellt wurde */
  createdAt?: string;

  /** Zeitstempel, wann das Todo zuletzt aktualisiert wurde */
  updatedAt?: string;
}
