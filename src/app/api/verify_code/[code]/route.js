import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    const body = await request.json();
    const accessCode = body.accessCode;

    if (!accessCode) {
      return NextResponse.json({ success: false, message: 'Access code required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const response = await supabase.from('shortsites').select('*').eq('code', code);

    if (!response.data || response.data.length === 0) {
      return NextResponse.json({ success: false, message: 'Site not found' }, { status: 404 });
    }

    const siteData = response.data[0];

    if (siteData.password_hash === accessCode) {
      const cookieStore = await cookies();
      const { mergeSitesCookie } = await import('@/lib/auth-server');
      const sites = mergeSitesCookie(cookieStore, code, accessCode);

      const responseData = NextResponse.json({ success: true });
      responseData.cookies.set('sites', JSON.stringify(sites), {
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });

      return responseData;
    } else {
      return NextResponse.json({ success: false, message: 'Invalid access code' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ success: false, message: 'An error occurred' }, { status: 500 });
  }
}

