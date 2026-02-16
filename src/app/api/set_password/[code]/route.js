import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getAccessCodeFromSitesCookie } from '@/lib/auth-server';

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    const formData = await request.formData();
    const password = formData.get('password');

    if (!password) {
      return NextResponse.json({ success: false, message: 'Password required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessCode = getAccessCodeFromSitesCookie(cookieStore, code);
    if (!accessCode) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
    }

    const supabase = createServerClient();
    const { data: site } = await supabase.from('shortsites').select('password_hash').eq('code', code).single();
    if (!site || site.password_hash !== accessCode) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
    }

    const response = await supabase.from('shortsites').update({
      password_hash: password
    }).eq('code', code);

    if (response.error) {
      throw new Error(response.error.message);
    }

    return NextResponse.json({ success: true, authorized: true });
  } catch (error) {
    console.error('Error setting password:', error);
    return NextResponse.json({ success: false, message: error.message || 'An error occurred' }, { status: 500 });
  }
}

