import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const testPlanId = `test_plan_${Date.now()}`;
const channelName = `spotishare_plan_${testPlanId}`;

console.log(`[TEST SYNC] Initializing 2 isolated Realtime clients on channel: ${channelName}`);
console.log(`[TEST SYNC] Target DB URL Host: ${new URL(supabaseUrl).host}`);

const clientA = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const clientB = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const userA = { id: 'user_test_A_111', name: 'User A (Admin)', email: 'usera@test.com' };
const userB = { id: 'user_test_B_222', name: 'User B (Member)', email: 'userb@test.com' };

const testTrackA = {
  id: 'spotify_track_123',
  title: 'CALCOLATRICI',
  artist: 'Sfera Ebbasta, Geolier, Baby Gang',
  album: 'X2VR',
  durationSec: 198,
  coverUrl: 'https://i.scdn.co/image/ab67616d0000b27341e8c950de070bb4e16d44ef',
  spotifyUrl: 'https://open.spotify.com/track/spotify_track_123',
  genre: 'Trap Italiano',
  audioTheme: 'energetic'
};

async function runSimulation() {
  const log: { step: string; timestamp: string; details: any; success: boolean }[] = [];

  const record = (step: string, details: any, success: boolean) => {
    const entry = { step, timestamp: new Date().toISOString(), details, success };
    log.push(entry);
    console.log(`\n[${entry.timestamp}] ${success ? '✅' : '❌'} ${step}`);
    console.log(JSON.stringify(details, null, 2));
  };

  try {
    // 1. Client A subscribe
    const chanA = clientA.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: userA.id } }
    });

    // 2. Client B subscribe
    const chanB = clientB.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: userB.id } }
    });

    let clientBReceivedTrackChange: any = null;
    let clientAReceivedStateRequest: any = null;
    let clientBReceivedStateReply: any = null;
    let clientBReceivedPresence: any = null;

    chanB.on('broadcast', { event: 'track_change' }, (payload: any) => {
      if (!clientBReceivedTrackChange) {
        clientBReceivedTrackChange = payload;
      } else {
        clientBReceivedStateReply = payload;
      }
    });

    chanA.on('broadcast', { event: 'request_state' }, (payload: any) => {
      clientAReceivedStateRequest = payload;
      // Auto-reply with User A's current state
      chanA.send({
        type: 'broadcast',
        event: 'track_change',
        payload: {
          memberId: userA.id,
          track: testTrackA,
          isPlaying: true,
          progressSec: 45,
          device: 'Spotify Web Player',
          updatedAt: Date.now()
        }
      });
    });

    chanB.on('presence', { event: 'sync' }, () => {
      clientBReceivedPresence = chanB.presenceState();
    });

    // Subscribe A
    const subAStatus = await new Promise<string>((resolve) => {
      chanA.subscribe((status) => resolve(status));
    });
    record('STEP 1: Client A Subscription', { status: subAStatus, channel: channelName }, subAStatus === 'SUBSCRIBED');

    // Subscribe B
    const subBStatus = await new Promise<string>((resolve) => {
      chanB.subscribe((status) => resolve(status));
    });
    record('STEP 2: Client B Subscription', { status: subBStatus, channel: channelName }, subBStatus === 'SUBSCRIBED');

    // 3. User A broadcasts track change
    const stateA = {
      memberId: userA.id,
      track: testTrackA,
      isPlaying: true,
      progressSec: 15,
      device: 'Spotify Web Player',
      updatedAt: Date.now()
    };

    await chanA.track(stateA);
    const sendResult = await chanA.send({
      type: 'broadcast',
      event: 'track_change',
      payload: stateA
    });
    record('STEP 3: Client A Sends Broadcast', { sendStatus: sendResult, payload: stateA }, sendResult === 'ok');

    // Wait for Client B to receive broadcast
    await new Promise((r) => setTimeout(r, 1200));
    record(
      'STEP 4: Client B Receives Live Broadcast',
      { received: clientBReceivedTrackChange },
      Boolean(clientBReceivedTrackChange?.payload?.memberId === userA.id)
    );

    // 4. Client B sends request_state (simulating User B loading the page after A was already playing)
    const reqSendResult = await chanB.send({
      type: 'broadcast',
      event: 'request_state',
      payload: { requestedBy: userB.id }
    });
    record('STEP 5: Client B Sends State Request', { sendStatus: reqSendResult }, reqSendResult === 'ok');

    // Wait for Client A to receive and reply
    await new Promise((r) => setTimeout(r, 1200));
    record(
      'STEP 6: Client A Receives Request & Client B Receives State Reply',
      {
        clientAReceivedStateRequest,
        clientBReceivedStateReply
      },
      Boolean(clientBReceivedStateReply?.payload?.memberId === userA.id)
    );

    // 5. Presence state check
    record(
      'STEP 7: Client B Reads Presence State',
      { presenceState: clientBReceivedPresence },
      Boolean(clientBReceivedPresence && Object.keys(clientBReceivedPresence).length > 0)
    );

    // Clean up
    await clientA.removeChannel(chanA);
    await clientB.removeChannel(chanB);

    console.log('\n=========================================');
    console.log('REPRODUCTION SCRIPT COMPLETED.');
    console.log('=========================================');
    process.exit(0);
  } catch (err: any) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  }
}

runSimulation();
