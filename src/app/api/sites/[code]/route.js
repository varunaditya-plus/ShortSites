import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { getAccessCodeFromSitesCookie, mergeSitesCookie } from '@/lib/auth-server';

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const accessCodeParam = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Site code is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('shortsites')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const cookieStore = await cookies();
    let accessCode = getAccessCodeFromSitesCookie(cookieStore, code);
    if (!accessCode && accessCodeParam) accessCode = accessCodeParam;

    const accessCodeValid = accessCode && data.password_hash === accessCode;

    if (accessCodeValid) {
      const responseData = NextResponse.json({
        data: {
          code: data.code,
          html: data.html,
          css: data.css,
          javascript: data.javascript,
          authorized: true
        }
      });
      if (!getAccessCodeFromSitesCookie(cookieStore, code) && accessCodeParam) {
        const sites = mergeSitesCookie(cookieStore, code, accessCodeParam);
        responseData.cookies.set('sites', JSON.stringify(sites), {
          maxAge: 60 * 60 * 24 * 365,
          path: '/',
        });
      }
      return responseData;
    }

    return NextResponse.json({
      data: {
        code: data.code,
        html: data.html,
        css: data.css,
        javascript: data.javascript,
        authorized: false
      }
    });
  } catch (error) {
    console.error('Error fetching site:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
