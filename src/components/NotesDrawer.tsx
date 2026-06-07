import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Pin, PinOff, Trash2, Plus, Save, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNotes, NOTE_COLORS, type NoteColor, noteSchema } from '@/hooks/useNotes';
import { useRole } from '@/contexts/RoleContext';

const COLOR_CLASS: Record<NoteColor, string> = {
  amber: 'bg-amber-100/70 dark:bg-amber-500/15 border-amber-300/60 dark:border-amber-400/30',
  orange: 'bg-orange-100/70 dark:bg-orange-500/15 border-orange-300/60 dark:border-orange-400/30',
  rose: 'bg-rose-100/70 dark:bg-rose-500/15 border-rose-300/60 dark:border-rose-400/30',
  emerald: 'bg-emerald-100/70 dark:bg-emerald-500/15 border-emerald-300/60 dark:border-emerald-400/30',
  sky: 'bg-sky-100/70 dark:bg-sky-500/15 border-sky-300/60 dark:border-sky-400/30',
  violet: 'bg-violet-100/70 dark:bg-violet-500/15 border-violet-300/60 dark:border-violet-400/30',
};
const COLOR_DOT: Record<NoteColor, string> = {
  amber: 'bg-amber-400',
  orange: 'bg-orange-500',
  rose: 'bg-rose-400',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
};

export function NotesDrawer() {
  const { notes, addNote, updateNote, removeNote } = useNotes();
  const { userName, canCreate, canDelete } = useRole();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('amber');
  const [editingId, setEditingId] = useState<string | null>(null);

  const reset = () => { setTitle(''); setContent(''); setColor('amber'); setEditingId(null); };

  const handleSave = async () => {
    const parsed = noteSchema.safeParse({ title, content, color, pinned: false });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Datos inválidos');
      return;
    }
    try {
      if (editingId) {
        await updateNote(editingId, { title, content, color });
        toast.success('Nota actualizada');
      } else {
        await addNote({ title, content, color, pinned: false }, userName);
        toast.success('Nota creada');
      }
      reset();
    } catch (e: any) {
      toast.error('Error al guardar', { description: e?.message });
    }
  };

  const startEdit = (id: string) => {
    const n = notes.find(x => x.id === id);
    if (!n) return;
    setEditingId(id);
    setTitle(n.title);
    setContent(n.content);
    setColor(n.color as NoteColor);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          aria-label="Notas y recordatorios"
          className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full shadow-xl gradient-orange text-primary-foreground hover:scale-105 transition-transform"
        >
          <StickyNote className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card border-l border-border overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <StickyNote className="w-5 h-5 text-primary" /> Notas y recordatorios
          </SheetTitle>
        </SheetHeader>

        {canCreate && (
          <div className="rounded-xl border border-border bg-background/40 p-3 mb-4 space-y-2">
            <Input
              placeholder="Título (opcional)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              className="bg-background/60"
            />
            <Textarea
              placeholder="Escribe un recordatorio…"
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={2000}
              rows={3}
              className="bg-background/60 resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    className={cn('w-5 h-5 rounded-full border-2 transition-transform', COLOR_DOT[c],
                      color === c ? 'border-foreground scale-110' : 'border-transparent')}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                {editingId && (
                  <Button size="sm" variant="ghost" onClick={reset} className="h-8">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="sm" onClick={handleSave} className="gradient-orange h-8">
                  {editingId ? <Save className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                  {editingId ? 'Guardar' : 'Añadir'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {notes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Sin notas todavía.</p>
          )}
          {notes.map(n => (
            <div
              key={n.id}
              className={cn('rounded-lg border p-3 transition-shadow hover:shadow-md', COLOR_CLASS[n.color as NoteColor] ?? COLOR_CLASS.amber)}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  {n.title && <h4 className="text-sm font-semibold text-foreground truncate">{n.title}</h4>}
                  <p className="text-xs text-muted-foreground">
                    {n.created_by ?? 'Anónimo'} · {new Date(n.updated_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {canCreate && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateNote(n.id, { pinned: !n.pinned })} title={n.pinned ? 'Desfijar' : 'Fijar'}>
                      {n.pinned ? <PinOff className="w-3.5 h-3.5 text-primary" /> : <Pin className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                  {canCreate && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(n.id)} title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeNote(n.id)} title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{n.content}</p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}