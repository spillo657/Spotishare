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

async function inspect() {
  console.log('[DB INSPECT] Querying plans (read-only)...');
  const { data: plans, error: planErr } = await client.from('plans').select('id, name, invite_code, max_members');
  console.log('Plans:', plans, planErr || '');

  console.log('[DB INSPECT] Querying users (read-only, sanitized)...');
  const { data: users, error: userErr } = await client.from('users').select('id, name, email, role, plan_id');
  if (users) {
    const sanitized = users.map(u => ({
      id: u.id,
      name: u.name,
      emailMasked: u.email ? u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
      role: u.role,
      plan_id: u.plan_id
    }));
    console.log('Users (sanitized):', sanitized);
  } else {
    console.log('User error:', userErr);
  }
}

inspect();
