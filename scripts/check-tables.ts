import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = value;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const client = createClient(supabaseUrl, supabaseAnonKey);

async function checkAllTables() {
  const tables = ['users', 'plans', 'payments', 'settings', 'group_settings', 'activity', 'playback'];
  for (const t of tables) {
    const { data, error } = await client.from(t).select('*').limit(1);
    console.log(`Table '${t}':`, error ? `NOT FOUND / ERROR: ${error.message}` : `EXISTS, columns: ${Object.keys(data[0] || {})}`);
  }
}

checkAllTables();
