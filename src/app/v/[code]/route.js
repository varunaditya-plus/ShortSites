import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { mergeSitesCookie } from '@/lib/auth-server';

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    const body = await request.json().catch(() => ({}));
    const accessCode = body.accessCode ?? body.code ?? '';

    if (!accessCode) {
      return NextResponse.json({ ok: false, message: 'Access code required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: site, error } = await supabase
      .from('shortsites')
      .select('code, password_hash')
      .eq('code', code)
      .single();

    if (error || !site || site.password_hash !== accessCode || site.code !== code) {
      return NextResponse.json({ ok: false, message: 'Invalid access code' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const sites = mergeSitesCookie(cookieStore, code, accessCode);

    const res = NextResponse.json({ ok: true });
    res.cookies.set('sites', JSON.stringify(sites), {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('Verify edit access:', err);
    return NextResponse.json({ ok: false, message: 'An error occurred' }, { status: 500 });
  }
}
