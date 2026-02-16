import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const codesParam = searchParams.get('codes');
    
    if (!codesParam) {
      return NextResponse.json({ error: 'codes parameter is required' }, { status: 400 });
    }

    // Parse codes - can be comma-separated string or array
    const codes = codesParam.split(',').map(code => code.trim()).filter(code => code.length > 0);
    
    if (codes.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('shortsites')
      .select('code, html, css, javascript')
      .in('code', codes);

    if (error) {
      console.error('Error fetching sites:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error in sites API:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
