import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  MemberService,
  SkillService,
  ExperienceService,
  AchievementService,
  LinkService,
  CertificationService,
} from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      member,
      skills = [],
      experiences = [],
      achievements = [],
      links = [],
      certifications = [],
      resume_url,
      isUpdate = false
    } = await req.json();

    const memberData = { ...member, id: user.id };
    if (resume_url) {
      memberData.resume_url = resume_url;
    }

    const existingMember = await MemberService.getMemberById(user.id);
    const memberExists = !!existingMember;

    await MemberService.upsertMember(memberData);

    await SkillService.removeSkillsByMemberId(user.id);
    if (skills && skills.length > 0) {
      const skillIds = await Promise.all(
        skills.map((name: string) => SkillService.getOrCreateSkill(name))
      );
      await Promise.all(
        skillIds.map(skillId => SkillService.addSkillToMember(user.id, skillId))
      );
    }

    await ExperienceService.removeExperiencesByMemberId(user.id);
    if (experiences && experiences.length > 0) {
      await Promise.all(
        experiences.map((exp: any) =>
          ExperienceService.createExperience({ ...exp, member_id: user.id })
        )
      );
    }

    await AchievementService.removeAchievementsByMemberId(user.id);
    if (achievements && achievements.length > 0) {
      await Promise.all(
        achievements.map((desc: string) =>
          AchievementService.createAchievement({
            member_id: user.id,
            description: desc,
            title: 'Achievement',
            date: new Date(),
          })
        )
      );
    }

    await LinkService.removeLinksByMemberId(user.id);
    if (links && links.length > 0) {
      await Promise.all(
        links.map((link: any) =>
          LinkService.createLink({ ...link, member_id: user.id })
        )
      );
    }
     // 6. Clear and re-insert certifications (like achievements)
    await CertificationService.removeCertificationsByMemberId(member.id);
    if (certifications && certifications.length > 0) {
      const certsToInsert = (certifications as any[])
        .filter((cert: any) => cert.name && cert.name.trim())
        .map((cert: any) => {
          const obj: any = {
            name: cert.name,
            member_id: member.id,
          };
          if (cert.issuing_organization && cert.issuing_organization.trim() !== '') {
            obj.issuing_organization = cert.issuing_organization;
          }
          // Do NOT include id for any row (let DB generate it)
          return obj;
        });
      await CertificationService.createCertifications(certsToInsert);
    }


    const userFolder = `resumes/${user.id}`;
    const { data: resumeFiles } = await supabase.storage
      .from('resume')
      .list(userFolder);

    const resumeCount = resumeFiles?.length || 0;

    if (resumeCount > 4 && resumeFiles) {
      const sorted = resumeFiles.sort((a, b) =>
        new Date(a.created_at || a.name).getTime() - new Date(b.created_at || b.name).getTime()
      );

      const oldest = sorted[0];
      if (oldest) {
        const { error: deleteError } = await supabase.storage
          .from('resume')
          .remove([`${userFolder}/${oldest.name}`]);

        if (deleteError) {
          console.error('Failed to delete oldest resume:', deleteError);
        } else {
          console.log('Deleted oldest resume version:', oldest.name);
        }
      }
    } 

    revalidatePath(`/profile/${user.id}`);

    return NextResponse.json({ 
      message: memberExists ? 'Profile updated successfully' : 'Profile created successfully',
      isUpdate: memberExists,
      resumeVersions: resumeCount
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userFolder = `resumes/${user.id}`;
    const { data: files, error: storageError } = await supabase.storage
      .from('resume')
      .list(userFolder);

    if (storageError) {
      throw storageError;
    }

    const resumeVersions = files?.map(file => ({
      name: file.name,
      created_at: file.created_at,
      size: file.metadata?.size || 0,
      publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resume/${userFolder}/${file.name}`
    })) || [];

    // Sort by creation date, newest first
    resumeVersions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      resumeVersions,
      count: resumeVersions.length
    });

  } catch (error) {
    console.error('Error fetching resume versions:', error);
    return NextResponse.json({ error: 'Failed to fetch resume versions' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    const userFolder = `resumes/${user.id}`;
    const { error: deleteError } = await supabase.storage
      .from('resume')
      .remove([`${userFolder}/${fileName}`]);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ message: 'Resume version deleted successfully' });

  } catch (error) {
    console.error('Error deleting resume version:', error);
    return NextResponse.json({ error: 'Failed to delete resume version' }, { status: 500 });
  }
}