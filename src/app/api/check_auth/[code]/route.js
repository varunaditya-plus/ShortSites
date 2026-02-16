import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAccessCodeFromSitesCookie } from '@/lib/auth-server';

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    const cookieStore = await cookies();
    const accessCode = getAccessCodeFromSitesCookie(cookieStore, code);

    return NextResponse.json({ authorized: !!accessCode });
  } catch (error) {
    console.error('Error checking auth:', error);
    return NextResponse.json({ authorized: false }, { status: 500 });
  }
}

