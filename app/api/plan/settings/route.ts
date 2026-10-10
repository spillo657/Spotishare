import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface CardDetails {
  holderName?: string;
  revolutTag?: string;
  revolutIban?: string;
  buddybankIban?: string;
  postepayCardNumber?: string;
  postepayFiscalCode?: string;
  bperIban?: string;
}

export interface GroupSettings {
  familyAddress?: string;
  cardDetails?: CardDetails;
  playlistUrl?: string;
}

// In-memory cache for POST to avoid extra DB reads during sanitization
const settingsCache = new Map<string, GroupSettings>();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Non autorizzato. Effettua l\'accesso a SpotiShare.'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_PLAN_ID',
        message: 'Identificativo del piano mancante'
      }, { status: 400 });
    }

    // Verify user belongs to this plan
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, plan_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.plan_id !== planId) {
      return NextResponse.json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Non sei un membro autorizzato di questo gruppo'
      }, { status: 403 });
    }

    // Fetch from group_settings table
    let settings: GroupSettings | null = null;
    try {
      const { data: dbSettings, error: dbError } = await supabase
        .from('group_settings')
        .select('family_address, card_details, playlist_url')
        .eq('plan_id', planId)
        .maybeSingle();

      if (!dbError && dbSettings) {
        settings = {
          familyAddress: dbSettings.family_address,
          cardDetails: dbSettings.card_details,
          playlistUrl: dbSettings.playlist_url,
        };
      }
    } catch {
      // Table might not exist yet
    }

    // Database is the single source of truth
    if (!settings) {
      return NextResponse.json({
        success: true,
        settings: null
      });
    }

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error: any) {
    console.error('Error in GET /api/plan/settings:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Non autorizzato. Effettua l\'accesso a SpotiShare.'
      }, { status: 401 });
    }

    const body = await request.json();
    const { planId, familyAddress, cardDetails, playlistUrl } = body;

    if (!planId) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_PLAN_ID',
        message: 'Identificativo del piano mancante'
      }, { status: 400 });
    }

    // Strictly verify that the user is the ADMIN of this plan
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, plan_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.plan_id !== planId || userData.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Solo l\'amministratore del gruppo può modificare le coordinate e le impostazioni'
      }, { status: 403 });
    }

    // Fetch existing settings from DB to preserve unspecified fields
    let existing: GroupSettings = {};
    try {
      const { data: dbSettings, error: dbError } = await supabase
        .from('group_settings')
        .select('family_address, card_details, playlist_url')
        .eq('plan_id', planId)
        .maybeSingle();

      if (!dbError && dbSettings) {
        existing = {
          familyAddress: dbSettings.family_address,
          cardDetails: dbSettings.card_details,
          playlistUrl: dbSettings.playlist_url,
        };
      }
    } catch {
      // Table might not exist, use empty object
    }

    // Sanitize and construct verified settings
    const sanitizedSettings: GroupSettings = {
      familyAddress: typeof familyAddress === 'string' ? familyAddress.trim().slice(0, 255) : (existing.familyAddress || ''),
      cardDetails: cardDetails ? {
        holderName: typeof cardDetails.holderName === 'string' ? cardDetails.holderName.trim().slice(0, 100) : '',
        revolutTag: typeof cardDetails.revolutTag === 'string' ? cardDetails.revolutTag.trim().slice(0, 50) : '',
        revolutIban: typeof cardDetails.revolutIban === 'string' ? cardDetails.revolutIban.trim().replace(/\s/g, '').toUpperCase().slice(0, 40) : '',
        buddybankIban: typeof cardDetails.buddybankIban === 'string' ? cardDetails.buddybankIban.trim().replace(/\s/g, '').toUpperCase().slice(0, 40) : '',
        postepayCardNumber: typeof cardDetails.postepayCardNumber === 'string' ? cardDetails.postepayCardNumber.trim().slice(0, 30) : '',
        postepayFiscalCode: typeof cardDetails.postepayFiscalCode === 'string' ? cardDetails.postepayFiscalCode.trim().toUpperCase().slice(0, 20) : '',
        bperIban: typeof cardDetails.bperIban === 'string' ? cardDetails.bperIban.trim().replace(/\s/g, '').toUpperCase().slice(0, 40) : ''
      } : existing.cardDetails,
      playlistUrl: typeof playlistUrl === 'string' ? playlistUrl.trim().slice(0, 300) : (existing.playlistUrl || '')
    };

    // Update in-memory cache for subsequent requests
    settingsCache.set(planId, sanitizedSettings);

    // Persist to group_settings table
    try {
      await supabase
        .from('group_settings')
        .upsert({
          plan_id: planId,
          family_address: sanitizedSettings.familyAddress,
          card_details: sanitizedSettings.cardDetails,
          playlist_url: sanitizedSettings.playlistUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'plan_id' });
    } catch (dbError) {
      console.error('Failed to persist group_settings:', dbError);
      return NextResponse.json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Errore durante il salvataggio delle impostazioni nel database'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Impostazioni e coordinate aggiornate con successo',
      settings: sanitizedSettings
    });

  } catch (error: any) {
    console.error('Error in POST /api/plan/settings:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}