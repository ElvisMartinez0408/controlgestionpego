import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from './authDb';

export interface InvitationCode {
  id: string;
  code: string;
  role: AppRole;
  used: boolean;
  used_by_name: string | null;
  used_at: string | null;
  created_by: string | null;
  expires_at: string | null;
  enabled: boolean;
  created_at: string;
}

export function generateCode(): string {
  let s = String(Math.floor(Math.random() * 9) + 1);
  for (let i = 1; i < 10; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export async function listInvitationCodes(): Promise<InvitationCode[]> {
  const { data, error } = await supabase
    .from('invitation_codes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InvitationCode[];
}

export async function createInvitationCode(input: {
  code: string;
  role: AppRole;
  createdBy?: string;
  expiresAt?: string | null;
}): Promise<InvitationCode> {
  const { data, error } = await supabase
    .from('invitation_codes')
    .insert({
      code: input.code.trim(),
      role: input.role,
      created_by: input.createdBy ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .select()
    .single();
  if (error) {
    if ((error as any).code === '23505') throw new Error('Ese código ya existe');
    throw error;
  }
  return data as InvitationCode;
}

export async function deleteInvitationCode(id: string): Promise<void> {
  const { error } = await supabase.from('invitation_codes').delete().eq('id', id);
  if (error) throw error;
}

export async function setInvitationCodeEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('invitation_codes').update({ enabled }).eq('id', id);
  if (error) throw error;
}

export type RedeemResult =
  | { ok: true; role: AppRole }
  | { ok: false; reason: 'NOT_FOUND' | 'DISABLED' | 'USED' | 'EXPIRED' };

/**
 * Atomically validates and consumes a single-use invitation code.
 * Validates: existence, enabled, not used, not expired.
 * Returns the role bound by the admin if successful.
 */
export async function redeemInvitationCode(code: string, usedByName: string): Promise<RedeemResult> {
  const trimmed = code.trim();
  const { data: row, error } = await supabase
    .from('invitation_codes')
    .select('*')
    .eq('code', trimmed)
    .maybeSingle();
  if (error) throw error;
  if (!row) return { ok: false, reason: 'NOT_FOUND' };
  if (!row.enabled) return { ok: false, reason: 'DISABLED' };
  if (row.used) return { ok: false, reason: 'USED' };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'EXPIRED' };
  }

  // Atomic claim: only succeeds if still unused
  const { data: claimed, error: claimErr } = await supabase
    .from('invitation_codes')
    .update({ used: true, used_by_name: usedByName, used_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('used', false)
    .select()
    .maybeSingle();
  if (claimErr) throw claimErr;
  if (!claimed) return { ok: false, reason: 'USED' };

  return { ok: true, role: row.role as AppRole };
}