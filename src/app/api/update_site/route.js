import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getAccessCodeFromSitesCookie } from '@/lib/auth-server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const code = formData.get('code');
    const html = formData.get('html');
    const css = formData.get('css');
    const js = formData.get('js');

    if (!code || !html || !css || !js) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessCode = getAccessCodeFromSitesCookie(cookieStore, code);
    if (!accessCode) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
    }

    const db = createServerClient();
    const { data: site } = await db.from('shortsites').select('password_hash').eq('code', code).single();
    if (!site || site.password_hash !== accessCode) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
    }

    const response = await db.from('shortsites').update({
      html: html,
      css: css,
      javascript: js
    }).eq('code', code);

    if (response.error) {
      throw new Error(response.error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating site:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}

