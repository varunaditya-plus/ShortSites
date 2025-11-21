'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getValidatedCodes } from '@/lib/auth';
import { ArrowRightIcon } from '@phosphor-icons/react';

export default function Home() {
  const [sites, setSites] = useState([]);

  useEffect(() => {
    const loadSites = async () => {
      const validatedCodes = getValidatedCodes();
      if (validatedCodes.length > 0) {
        const { data } = await supabase
          .from('shortsites')
          .select('*')
          .in('code', validatedCodes);
        
        if (data) {
          setSites(data);
        }
      }
    };

    loadSites();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 md:mt-12">
        <h1 className="text-5xl font-medium mb-4">shortsites</h1>
        
        <p className="text-white mb-6 text-3xl">
          easily create a html, css, js website in seconds and upload it to the internet for everyone to see. the goal of shortsites is to teach students how to write basic websites through our modern editor.
        </p>
        
        <Link 
          href="/create" 
          className="inline-flex items-center gap-2 bg-white text-black text-xl px-6 py-2.5 font-medium hover:bg-neutral-200 active:translate-y-[6px] active:border-b-0 active:border-b-6 active:border-black transition border-b-6 border-neutral-700"
        >
          Make a shortsite
          <ArrowRightIcon size={20} />
        </Link>

        {sites.length > 0 && (
          <div className="mt-8 w-full">
            {sites.map((site) => (
              <div 
                key={site.code} 
                className="flex justify-between items-center bg-neutral-800 px-4 py-2.5 mb-2 w-full text-xl"
              >
                <a className="text-white hover:underline" href={`/s/${site.code}` } target="_blank">shortsite/{site.code}</a>
                <div className="flex gap-4 text-white">
                  <Link href={`/s/${site.code}`} className="hover:underline">
                    View
                  </Link>
                  <Link 
                    href={`/edit/${site.code}?code=${encodeURIComponent(site.password_hash || '')}`}
                    className="hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
