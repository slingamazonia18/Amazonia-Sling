
import { createClient } from '@supabase/supabase-js';

/**
 * IMPORTANTE: Para Vercel, debes configurar estas variables de entorno 
 * en el Dashboard del proyecto: Settings > Environment Variables
 * SUPABASE_URL: URL de tu proyecto Supabase
 * SUPABASE_ANON_KEY: Tu clave anon/public
 */

const supabaseUrl = process.env.SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'tu-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
