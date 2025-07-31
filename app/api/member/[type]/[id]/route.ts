import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

import {
  AchievementService,
  ExperienceService,
  LinkService,
  SkillService,
  MemberService,
  CertificationService,
  ProjectService,
} from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  const { type, id } = params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    switch (type) {
      case 'achievements':
        return NextResponse.json(await AchievementService.getMemberAchievements(supabase, id));
      case 'experience':
        return NextResponse.json(await ExperienceService.getMemberExperiences(supabase, id));
      case 'links':
        return NextResponse.json(await LinkService.getMemberLinks(supabase, id));
      case 'skills':
        return NextResponse.json(await SkillService.getMemberSkills(supabase, id));
      case 'certifications':
        return NextResponse.json(await CertificationService.getMemberCertifications(supabase, id));
      case 'projects':
        return NextResponse.json(await ProjectService.getMemberProjects(supabase, id));
      case 'profile': {
        const member = await MemberService.getMemberById(supabase, id);
        if (!member) {
          return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }
        return NextResponse.json(member);
      }
      default:
        return NextResponse.json({ error: 'Invalid member type' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: `Failed to fetch ${type}: ${error.message}` }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  const { type, id } = params;

  if (type !== 'achievements' && type !== 'projects') {
    return NextResponse.json({ error: 'DELETE not supported for this type' }, { status: 405 });
  }

  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (type === 'achievements') {
      await AchievementService.deleteAchievement(supabase, id);
      return NextResponse.json({ message: 'Achievement deleted successfully' });
    }
    if (type === 'projects') {
      await ProjectService.removeProject(supabase, id);
      return NextResponse.json({ message: 'Project deleted successfully' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: `Failed to delete ${type}: ${error.message}` }, { status: 500 });
  }
}

