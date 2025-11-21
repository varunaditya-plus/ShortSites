import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

function generateCode() {
  const alphanumeric = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 5 }, () => 
    alphanumeric[Math.floor(Math.random() * alphanumeric.length)]
  ).join('');
}

function generateAccessKey() {
  const alphanumeric = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => 
    alphanumeric[Math.floor(Math.random() * alphanumeric.length)]
  ).join('');
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const html = formData.get('html');
    const css = formData.get('css');
    const js = formData.get('js');

    if (!html || !css || !js) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();
    let code = generateCode();

    // Check if code exists, regenerate if needed
    let checkResult = await supabase.from('shortsites').select('*').eq('code', code);
    while (checkResult.data && checkResult.data.length > 0) {
      code = generateCode();
      checkResult = await supabase.from('shortsites').select('*').eq('code', code);
    }

    const accessKey = generateAccessKey();

    const response = await supabase.from('shortsites').insert({
      html: html,
      css: css,
      javascript: js,
      code: code,
      password_hash: accessKey
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

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

    const domain = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const url = `${protocol}://${domain}/s/${code}`;
    const editLink = `${protocol}://${domain}/edit/${code}?code=${encodeURIComponent(accessKey)}`;

    // Create response with cookies
    const responseData = NextResponse.json({
      link: url,
      access_key: accessKey,
      edit_link: editLink
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
  } catch (error) {
    console.error('Error uploading site:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}

