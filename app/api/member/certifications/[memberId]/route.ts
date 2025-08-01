import { NextRequest, NextResponse } from 'next/server';
import { CertificationService } from '@/lib/db';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const createAuthenticatedClient = (req: NextRequest): SupabaseClient | null => {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );
};

export async function GET(req: NextRequest, context: any) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const certifications = await CertificationService.getMemberCertifications(supabase, context.params.memberId);
    return NextResponse.json(certifications);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: any) {
  try {
    const supabase = createAuthenticatedClient(req);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    // Accepts either a single certification or an array
    if (Array.isArray(body)) {
      const data = await CertificationService.createCertifications(
        supabase,
        body.map((cert: any) => ({ ...cert, member_id: context.params.memberId }))
      );
      return NextResponse.json(data);
    } else {
      const data = await CertificationService.createCertifications(
        supabase,
        [{ ...body, member_id: context.params.memberId }]
      );
      return NextResponse.json(data[0]);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: any) {
  try {
    const supabase = createAuthenticatedClient(req);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await CertificationService.removeCertificationsByMemberId(supabase, context.params.memberId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 