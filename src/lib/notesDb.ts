import Dexie, { Table } from 'dexie';

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

class NotesDatabase extends Dexie {
  notes!: Table<NoteRow, string>;
  constructor() {
    super('gyc_notes');
    this.version(1).stores({ notes: '&id, updated_at, pinned' });
  }
}

export const notesDb = new NotesDatabase();

export async function cacheNotes(notes: NoteRow[]) {
  await notesDb.notes.clear();
  if (notes.length) await notesDb.notes.bulkPut(notes);
}

export async function loadCachedNotes(): Promise<NoteRow[]> {
  return notesDb.notes.toArray();
}

export async function putCachedNote(note: NoteRow) {
  await notesDb.notes.put(note);
}

export async function deleteCachedNote(id: string) {
  await notesDb.notes.delete(id);
}