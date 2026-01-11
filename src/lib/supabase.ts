import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'player' | 'witness' | 'admin';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  referral_code: string | null;
  referred_by: string | null;
  payment_qr_code: string | null;
  status: 'active' | 'banned';
  witness_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  rules: string;
  status: 'active' | 'banned' | 'expired';
  reveal_date: string;
  yes_total?: number;
  no_total?: number;
  created_at: string;
  updated_at: string;
}

export interface Bet {
  id: string;
  event_id: string;
  user_id: string;
  direction: 'yes' | 'no';
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  witness_id: string;
  created_at: string;
  confirmed_at: string | null;
}
