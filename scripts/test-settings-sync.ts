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

const clientA = createClient(supabaseUrl, supabaseAnonKey);
const clientB = createClient(supabaseUrl, supabaseAnonKey);

const testPlanId = `test_plan_${Date.now()}`;
const channelName = `spotishare_settings_${testPlanId}`;

async function testSettingsSync() {
  console.log(`[SETTINGS TEST] Subscribing Client A & B to ${channelName}...`);

  const chanA = clientA.channel(channelName, { config: { broadcast: { self: false } } });
  const chanB = clientB.channel(channelName, { config: { broadcast: { self: false } } });

  let clientBReceivedSettings: any = null;

  chanB.on('broadcast', { event: 'settings_update' }, ({ payload }) => {
    clientBReceivedSettings = payload;
  });

  await new Promise(r => chanA.subscribe(r));
  await new Promise(r => chanB.subscribe(r));

  console.log('✅ Both clients SUBSCRIBED to settings channel.');

  // Client A saves new address
  const updatePayload = {
    familyAddress: 'Via Garibaldi 42, 20100 Milano (MI)',
    cardDetails: { holderName: 'Admin SpotiShare', revolutTag: '@adminspot' }
  };

  const sendRes = await chanA.send({
    type: 'broadcast',
    event: 'settings_update',
    payload: updatePayload
  });

  console.log('Client A send result:', sendRes);

  await new Promise(r => setTimeout(r, 1200));

  if (clientBReceivedSettings?.familyAddress === updatePayload.familyAddress) {
    console.log('✅ SUCCESS: Client B received settings update via Realtime:');
    console.log(JSON.stringify(clientBReceivedSettings, null, 2));
  } else {
    console.error('❌ FAILED: Client B did not receive settings update:', clientBReceivedSettings);
  }

  await clientA.removeChannel(chanA);
  await clientB.removeChannel(chanB);
}

testSettingsSync();
