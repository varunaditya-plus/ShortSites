import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    const cookieStore = await cookies();
    const isAuthorized = cookieStore.get(`edit_auth_${code}`)?.value === 'true';

    return NextResponse.json({ authorized: isAuthorized });
  } catch (error) {
    console.error('Error checking auth:', error);
    return NextResponse.json({ authorized: false }, { status: 500 });
  }
}

