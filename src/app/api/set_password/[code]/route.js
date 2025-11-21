import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request, { params }) {
  try {
    const { code } = await params;
    const formData = await request.formData();
    const password = formData.get('password');

    if (!password) {
      return NextResponse.json({ success: false, message: 'Password required' }, { status: 400 });
    }

    // Check authorization
    const cookieStore = await cookies();
    const isAuthorized = cookieStore.get(`edit_auth_${code}`)?.value === 'true';

    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 });
    }

    const supabase = createServerClient();
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

