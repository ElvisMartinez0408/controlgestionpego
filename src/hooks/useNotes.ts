import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { cacheNotes, deleteCachedNote, loadCachedNotes, putCachedNote, type NoteRow } from '@/lib/notesDb';

export const NOTE_COLORS = ['amber', 'orange', 'rose', 'emerald', 'sky', 'violet'] as const;
export type NoteColor = typeof NOTE_COLORS[number];

export const noteSchema = z.object({
  title: z.string().trim().max(120, 'Máx 120 caracteres'),
  content: z.string().trim().min(1, 'El contenido no puede estar vacío').max(2000, 'Máx 2000 caracteres'),
  color: z.enum(NOTE_COLORS),
  pinned: z.boolean(),
});

export type NoteInput = z.infer<typeof noteSchema>;

export function useNotes() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('notes')
      .select('*')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    if (!error && data) {
      setNotes(data as NoteRow[]);
      cacheNotes(data as NoteRow[]).catch(() => {});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Hydrate from offline cache first for instant render
    loadCachedNotes().then(cached => {
      if (cached.length) setNotes(cached.sort((a, b) =>
        Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)));
    });
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const channel = (supabase as any)
      .channel(`notes_changes_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [fetchAll]);

  const addNote = async (input: NoteInput, createdBy?: string) => {
    const parsed = noteSchema.parse(input);
    const { data, error } = await (supabase as any)
      .from('notes')
      .insert({ ...parsed, created_by: createdBy ?? null })
      .select()
      .single();
    if (error) throw error;
    setNotes(prev => [data as NoteRow, ...prev]);
    putCachedNote(data as NoteRow).catch(() => {});
    return data as NoteRow;
  };

  const updateNote = async (id: string, patch: Partial<NoteInput>) => {
    const current = notes.find(n => n.id === id);
    if (!current) return;
    const merged = noteSchema.parse({
      title: patch.title ?? current.title,
      content: patch.content ?? current.content,
      color: (patch.color ?? current.color) as NoteColor,
      pinned: patch.pinned ?? current.pinned,
    });
    const { data, error } = await (supabase as any)
      .from('notes')
      .update({ ...merged, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setNotes(prev => prev.map(n => (n.id === id ? (data as NoteRow) : n)));
    putCachedNote(data as NoteRow).catch(() => {});
  };

  const removeNote = async (id: string) => {
    await (supabase as any).from('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    deleteCachedNote(id).catch(() => {});
  };

  return { notes, loading, addNote, updateNote, removeNote };
}