import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/lib/db';
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
    const projects = await ProjectService.getMemberProjects(supabase, context.params.memberId);
    return NextResponse.json(projects);
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
    if (Array.isArray(body)) {
      const data = await Promise.all(
        body.map((project: any) =>
          ProjectService.createProject(supabase, { ...project, member_id: context.params.memberId })
        )
      );
      return NextResponse.json(data);
    } else {
      const data = await ProjectService.createProject(supabase, { ...body, member_id: context.params.memberId });
      return NextResponse.json(data);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: any) {
  try {
    const supabase = createAuthenticatedClient(req);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    // expects { id, ...fields }
    const { id, ...fields } = body;
    const data = await ProjectService.updateProject(supabase, id, fields);
    return NextResponse.json(data);
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
    await ProjectService.removeProjectsByMemberId(supabase, context.params.memberId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 