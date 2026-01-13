
import { createClient } from '@supabase/supabase-js';

/**
 * Configuración de Supabase para Veterinaria Amazonia.
 * Se utilizan las credenciales proporcionadas directamente para asegurar 
 * que la aplicación funcione en cualquier entorno (Local o Vercel).
 */

const supabaseUrl = 'https://ermprfllhafectlxcoin.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybXByZmxsaGFmZWN0bHhjb2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTMzNjIsImV4cCI6MjA4Mzg4OTM2Mn0.bZsFZOvtJwOIkzHfTr-ZQBt83kGQFGU8-pBehCudLEA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
