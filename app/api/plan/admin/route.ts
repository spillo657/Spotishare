import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const { action, planId } = body;

    // ACTION: CREATE PLAN
    if (action === 'create_plan') {
      const { name, monthlyCost, maxMembers } = body;
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const planName = name || (user.user_metadata?.full_name ? `${user.user_metadata.full_name} Gruppo` : 'Il Mio Gruppo');

      const cost = typeof monthlyCost === 'number' && monthlyCost > 0 ? monthlyCost : 17.99;
      const membersCount = typeof maxMembers === 'number' && maxMembers >= 2 && maxMembers <= 6 ? maxMembers : 6;

      const { data: newPlan, error: planError } = await supabase
        .from('plans')
        .insert({
          name: planName,
          monthly_cost: cost,
          max_members: membersCount,
          invite_code: inviteCode
        })
        .select()
        .single();

      if (planError) {
        return NextResponse.json({ success: false, error: planError.message }, { status: 500 });
      }

      // Associate user with plan and assign admin role
      const { error: userError } = await supabase
        .from('users')
        .update({ plan_id: newPlan.id, role: 'admin' })
        .eq('id', user.id);

      if (userError) {
        return NextResponse.json({ success: false, error: userError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        plan: newPlan
      });
    }

    // For all other admin actions, verify the caller is admin of planId
    if (!planId) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_PLAN_ID',
        message: 'Identificativo del piano mancante'
      }, { status: 400 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, plan_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.plan_id !== planId || userData.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Azione riservata esclusivamente all\'amministratore del gruppo'
      }, { status: 403 });
    }

    // ACTION: UPDATE PLAN
    if (action === 'update_plan') {
      const { monthlyCost, maxMembers } = body;
      const cost = typeof monthlyCost === 'number' && monthlyCost > 0 ? monthlyCost : 17.99;
      const membersCount = typeof maxMembers === 'number' && membersCountValid(maxMembers) ? maxMembers : 6;

      const { data: updatedPlan, error: updateError } = await supabase
        .from('plans')
        .update({
          monthly_cost: cost,
          max_members: membersCount
        })
        .eq('id', planId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        plan: updatedPlan
      });
    }

    // ACTION: REMOVE MEMBER
    if (action === 'remove_member') {
      const { memberId } = body;
      if (!memberId) {
        return NextResponse.json({ success: false, error: 'Membro non specificato' }, { status: 400 });
      }

      if (memberId === user.id) {
        return NextResponse.json({ success: false, error: 'Non puoi rimuovere te stesso come amministratore con questa azione' }, { status: 400 });
      }

      const { error: removeError } = await supabase
        .from('users')
        .update({ plan_id: null })
        .eq('id', memberId)
        .eq('plan_id', planId);

      if (removeError) {
        return NextResponse.json({ success: false, error: removeError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Membro rimosso con successo'
      });
    }

    // ACTION: DELETE PAYMENT
    if (action === 'delete_payment') {
      const { paymentId } = body;
      if (!paymentId) {
        return NextResponse.json({ success: false, error: 'Pagamento non specificato' }, { status: 400 });
      }

      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)
        .eq('plan_id', planId);

      if (deleteError) {
        return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Pagamento eliminato con successo'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'INVALID_ACTION',
      message: 'Azione non riconosciuta'
    }, { status: 400 });

  } catch (error: any) {
    console.error('Error in /api/plan/admin:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}

function membersCountValid(count: any): boolean {
  return typeof count === 'number' && count >= 2 && count <= 6;
}
