'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { setEditAuth, addValidatedCode } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import '../../../styles/base.css';

export default function SitePage() {
  const params = useParams();
  const code = params.code;
  const [siteContent, setSiteContent] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSite = async () => {
      try {
        const { data, error } = await supabase
          .from('shortsites')
          .select('*')
          .eq('code', code)
          .single();

        if (error || !data) {
          // Site not found - could redirect to 404 page
          setLoading(false);
          return;
        }

        // Combine HTML, CSS, and JS
        let html = data.html || '';
        const css = data.css || '';
        const js = data.javascript || '';

        // Replace placeholders
        html = html.replace(/<style do-not-remove>[\s\S]*?<\/style>/, `<style>${css}</style>`);
        html = html.replace(/<script do-not-remove>[\s\S]*?<\/script>/, `<script>${js}</script>`);

        setSiteContent(html);

        // Check authorization
        const authResponse = await fetch(`/api/check_auth/${code}`);
        const authData = await authResponse.json();
        setIsAuthorized(authData.authorized || false);
        setLoading(false);
      } catch (error) {
        console.error('Error loading site:', error);
        setLoading(false);
      }
    };

    if (code) {
      loadSite();
    }
  }, [code]);

  const handleEditClick = () => {
    if (isAuthorized) {
      window.location.href = `/edit/${code}`;
    } else {
      setShowAccessModal(true);
    }
  };

  const handleDialogOpenChange = (open) => {
    setShowAccessModal(open);
    if (!open) {
      setAccessCode('');
    }
  };

  const handleSubmitCode = async () => {
    if (!accessCode.trim()) {
      alert('Please enter an access code');
      return;
    }

    try {
      const response = await fetch(`/api/verify_code/${code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessCode: accessCode }),
      });

      const data = await response.json();

      if (data.success) {
        setEditAuth(code, true);
        addValidatedCode(code);
        setIsAuthorized(true);
        setShowAccessModal(false);
        window.location.href = `/edit/${code}?code=${encodeURIComponent(accessCode)}`;
      } else {
        setShowAccessModal(false);
        setShowUnauthorizedModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-100">
        <p>Loading...</p>
      </div>
    );
  }

  if (!siteContent) {
    return (
      <div className="flex flex-col font-sans m-0 min-h-screen text-zinc-100 items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center justify-center bg-zinc-900 p-6 border border-zinc-800 max-w-3xl w-full text-center rounded-lg shadow-xl">
          <h1 className="text-3xl font-bold mb-1">Site Not Found</h1>
          <p className="text-lg text-zinc-300">
            The site you are looking for does not exist.{' '}
            <a href="/" className="text-blue-400 hover:text-blue-300 underline transition-colors">
              Go home
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="site-content" dangerouslySetInnerHTML={{ __html: siteContent }}></div>

      <button
        id="edit-button"
        onClick={handleEditClick}
        title="Edit this site"
      >
        ✏️
      </button>

      <Dialog open={showAccessModal} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Required</DialogTitle>
            <DialogDescription>
              Enter the access code to edit this site:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <input
              type="text"
              placeholder="Access code"
              autoComplete="off"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitCode()}
              className="h-9 px-3 py-2 bg-card border border-input rounded-md text-card-foreground placeholder-muted-foreground outline-none focus:border-white/40"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAccessModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCode}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnauthorizedModal} onOpenChange={setShowUnauthorizedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unauthorized</DialogTitle>
            <DialogDescription>
              You are not authorized to edit this site.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnauthorizedModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

