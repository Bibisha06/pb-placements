import { NextRequest, NextResponse } from 'next/server';
import { MemberService, SkillService, ExperienceService, AchievementService, LinkService } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { memberIds } = await request.json();
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No member IDs provided' },
        { status: 400 }
      );
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Fetch data for each member
    const membersData = [];
    
    for (const memberId of memberIds) {
      const member = await MemberService.getMemberById(supabase, memberId);
      
      if (member) {
        const skills = await SkillService.getMemberSkills(supabase, memberId);
        const experiences = await ExperienceService.getMemberExperiences(supabase, memberId);
        const achievements = await AchievementService.getMemberAchievements(supabase, memberId);
        const links = await LinkService.getMemberLinks(supabase, memberId);
        
        membersData.push({
          ...member,
          skills: skills.map((s: any) => s.name),
          experiences,
          achievements,
          links,
        });
      }
    }
    
    // Return the data as JSON
    return NextResponse.json({ members: membersData });
  } catch (error) {
    console.error('Error generating JSON:', error);
    
    return NextResponse.json(
      { success: false, message: 'Failed to generate JSON' },
      { status: 500 }
    );
  }
}