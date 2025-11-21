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
      // Get existing validated codes
      const cookieStore = await cookies();
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
      const responseData = NextResponse.json({ success: true });

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
    } else {
      return NextResponse.json({ success: false, message: 'Invalid access code' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ success: false, message: 'An error occurred' }, { status: 500 });
  }
}

