import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const accessCode = searchParams.get('code'); // Access code from URL query param

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

    // Check authorization
    const cookieStore = await cookies();
    let isAuthorized = cookieStore.get(`edit_auth_${code}`)?.value === 'true';
    
    // Also check if access code in URL matches
    const accessCodeValid = accessCode && data.password_hash === accessCode;

    // If access code is valid, set auth cookies (similar to verify_code endpoint)
    if (accessCodeValid && !isAuthorized) {
      // Get existing validated codes
      const validatedCodes = cookieStore.get('validated_codes')?.value;
      let codes = [];
      if (validatedCodes) {
        try {
          codes = JSON.parse(validatedCodes);
        } catch (e) {
          codes = [];
        }
      }
      if (!codes.includes(code)) {
        codes.push(code);
      }

      // Create response with cookies
      const responseData = NextResponse.json({
        data: {
          code: data.code,
          html: data.html,
          css: data.css,
          javascript: data.javascript,
          password_hash: data.password_hash,
          authorized: true
        }
      });

      // Set edit auth cookie
      responseData.cookies.set(`edit_auth_${code}`, 'true', {
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });

      // Set validated codes cookie
      responseData.cookies.set('validated_codes', JSON.stringify(codes), {
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });

      return responseData;
    }

    // Return site data
    // Note: password_hash is included but should be handled carefully on client
    return NextResponse.json({
      data: {
        code: data.code,
        html: data.html,
        css: data.css,
        javascript: data.javascript,
        password_hash: data.password_hash,
        authorized: isAuthorized || accessCodeValid
      }
    });
  } catch (error) {
    console.error('Error fetching site:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
