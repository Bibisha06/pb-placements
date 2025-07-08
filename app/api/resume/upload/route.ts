import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { extractTextFromPDF, analyzeWithGemini } from '@/lib/resume-parser';
import { Buffer } from 'buffer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized: No token' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (!user || authError) {
      console.error('Auth error:', authError?.message);
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const resumeFile = formData.get('resume') as File;

    if (!resumeFile) {
      return NextResponse.json({ success: false, message: 'No resume file provided' }, { status: 400 });
    }

    if (resumeFile.type !== 'application/pdf') {
      return NextResponse.json({ success: false, message: 'Only PDF files are supported' }, { status: 400 });
    }

    if (resumeFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    const fileBuffer = await resumeFile.arrayBuffer();
    let extractedText: string;
    let extractedLinks: string[];
    let parsedData: any;
    
    try {
      const extractionResult = await extractTextFromPDF(fileBuffer);
      extractedText = extractionResult.text;
      extractedLinks = extractionResult.links;
      if (!extractedText || extractedText.trim().length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Could not extract text from PDF. Please ensure the file contains readable text.' 
        }, { status: 400 });
      }
      parsedData = await analyzeWithGemini(extractedText, extractedLinks);
      if (!parsedData || !parsedData.name || !parsedData.email) {
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to parse resume. Please ensure the PDF contains readable text and valid contact information.' 
        }, { status: 400 });
      }
    } catch (parseError) {
      console.error('Error parsing resume:', parseError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to parse resume. Please check if the PDF is valid and contains readable text.'
  }, { status: 400 });
    }
    
    const username = user.user_metadata?.username || user.email?.split('@')[0] || user.id;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const userFolder = `resumes/${user.id}`;
    const fileName = `${userFolder}/${username}_${timestamp}.pdf`;

    const { data: existingFiles } = await supabase.storage
      .from('resume')
      .list(userFolder);

    if (existingFiles && existingFiles.length >= 4) {
      const sortedFiles = existingFiles.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      await supabase.storage
        .from('resume')
        .remove([`${userFolder}/${sortedFiles[0].name}`]);
    }

    const { error: uploadError, data } = await supabase.storage
      .from('resume')
      .upload(fileName, Buffer.from(fileBuffer), {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError || !data?.path) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ success: false, message: 'Failed to upload to Supabase' }, { status: 500 });
    }

    const publicResumeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resume/${data.path}`;
    parsedData.resume_url = publicResumeUrl;

    return NextResponse.json({
      success: true,
      id: uuidv4(),
      file_path: data.path,
      ...parsedData,
    });

  } catch (error) {
    console.error('Error processing resume:', error);
    return NextResponse.json({ success: false, message: 'Failed to process resume' }, { status: 500 });
  }
}