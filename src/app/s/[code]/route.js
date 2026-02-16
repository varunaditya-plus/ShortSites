import { createServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { code } = await params;

    if (!code) {
      return new NextResponse('Site not found', { status: 404 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('shortsites')
      .select('html, css, javascript')
      .eq('code', code)
      .single();

    if (error || !data) {
      return new NextResponse('Site not found', { status: 404 });
    }

    let html = data.html || '';
    const css = data.css || '';
    const js = data.javascript || '';

    // Replace placeholders with actual CSS and JS
    html = html.replace(/\[\[_CSS_\]\]/g, css);
    html = html.replace(/\[\[_JS_\]\]/g, js);

    // If HTML is already a complete document, use it as-is
    let finalHtml = html;
    
    // Check if it's a full HTML document
    const isFullDocument = html.trim().match(/^\s*<!DOCTYPE/i) || 
                          (html.includes('<html') && html.includes('<head') && html.includes('<body'));
    
    const getCookieScript = `
      function getSites() {
        try {
          var raw = document.cookie.split(';').map(function(s) { return s.trim(); }).filter(function(s) { return s.indexOf('sites=') === 0; })[0];
          if (!raw) return [];
          raw = decodeURIComponent(raw.split('=').slice(1).join('='));
          var arr = JSON.parse(raw);
          return Array.isArray(arr) ? arr : [];
        } catch (e) {
          return [];
        }
      }
      function getStoredAccessCode(sitecode) {
        var sites = getSites();
        var entry = sites.find(function(e) { return e.sitecode === sitecode; });
        return entry ? entry.accesscode : null;
      }
      function setStoredAccessCode(sitecode, accesscode) {
        var sites = getSites();
        var idx = sites.findIndex(function(e) { return e.sitecode === sitecode; });
        if (idx >= 0) sites[idx].accesscode = accesscode;
        else sites.push({ sitecode: sitecode, accesscode: accesscode });
        document.cookie = 'sites=' + encodeURIComponent(JSON.stringify(sites)) + '; path=/; max-age=31536000';
      }
      function removeStoredAccessCode(sitecode) {
        var sites = getSites().filter(function(e) { return e.sitecode !== sitecode; });
        document.cookie = 'sites=' + encodeURIComponent(JSON.stringify(sites)) + '; path=/; max-age=31536000';
      }
      function handleEditClick() {
        var sitecode = '${code}';
        var key = getStoredAccessCode(sitecode);
        if (!key) {
          key = prompt('Enter the access key to edit this site:');
          if (key === null) return;
          key = (key || '').trim();
          if (!key) return;
        }
        fetch('/v/' + sitecode, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: key }),
          credentials: 'same-origin'
        }).then(function(r) { return r.json().then(function(j) { return { ok: r.ok, j: j }; }).catch(function() { return { ok: r.ok, j: {} }; }); })
          .then(function(result) {
            if (result.ok && result.j.ok) {
              setStoredAccessCode(sitecode, key);
              window.location.href = '/edit/' + sitecode;
            } else {
              removeStoredAccessCode(sitecode);
              alert(result.j.message || 'Invalid access code.');
            }
          }).catch(function() {
            removeStoredAccessCode(sitecode);
            alert('Could not verify. Try again.');
          });
      }
    `;
    
    // Edit button styles
    const editButtonStyle = `
      #edit-button {
        position: fixed;
        bottom: 0;
        right: 0;
        background-color: #000000;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1000;
        font-size: 15px;
        border: 1px solid #FEC508;
        border-radius: 0;
        padding: 0;
        margin: 0;
      }
      #edit-button:hover {
        background-color: #22211f;
      }
    `;

    // Editor preview frame styles (match how the preview is shown in the editor iframe)
    const editorPreviewStyle = `
      html {
        box-sizing: border-box;
      }
      *, *::before, *::after {
        box-sizing: inherit;
      }
      body {
        margin: 0;
        height: 100vh;
        background-color: #0a0a0a;
      }
      .shortsite-preview-frame {
        width: 100%;
        max-width: 100%;
        height: 100%;
        background-color: #1a1a1a;
        overflow: auto;
      }
    `;
    
    // Edit button HTML
    const editButtonHtml = `<button id="edit-button" onclick="handleEditClick()" title="Edit this site">✏️</button>`;
    
    if (!isFullDocument) {
      // Extract head and body content if they exist in fragments
      let headContent = '';
      let bodyContent = html;
      
      if (html.includes('<head')) {
        const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        if (headMatch) {
          headContent = headMatch[1];
        }
      }
      
      if (html.includes('<body')) {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          bodyContent = bodyMatch[1];
        }
      }
      
      // Construct full HTML document with edit button and script
      finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${headContent}
    <style>${editorPreviewStyle}</style>
    <style>${editButtonStyle}</style>
    <script>${getCookieScript}</script>
</head>
<body>
<div class="shortsite-preview-frame">${bodyContent}</div>
${editButtonHtml}
</body>
</html>`;
    } else {
      // Ensure DOCTYPE is present
      if (!html.trim().match(/^\s*<!DOCTYPE/i)) {
        finalHtml = '<!DOCTYPE html>\n' + html;
      }
      
      // Inject styles and script into head and button into body
      // Add styles and script to head (before closing </head> tag)
      const headInjections = `<style>${editorPreviewStyle}</style>\n    <style>${editButtonStyle}</style>\n    <script>${getCookieScript}</script>`;
      
      if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `    ${headInjections}\n</head>`);
      } else if (finalHtml.includes('<head>')) {
        finalHtml = finalHtml.replace('<head>', `<head>\n    ${headInjections}`);
      } else if (finalHtml.includes('<head ')) {
        // Handle <head with attributes
        const headMatch = finalHtml.match(/(<head[^>]*>)/i);
        if (headMatch) {
          finalHtml = finalHtml.replace(headMatch[0], `${headMatch[0]}\n    ${headInjections}`);
        }
      } else {
        // No head tag, add before </html> or at end
        if (finalHtml.includes('</html>')) {
          finalHtml = finalHtml.replace('</html>', `<head>\n    ${headInjections}\n</head>\n</html>`);
        } else {
          finalHtml = `<head>\n    ${headInjections}\n</head>\n` + finalHtml;
        }
      }
      
      // Wrap body content in editor-preview frame and add button (match editor iframe styling)
      const bodyTagRegex = /<body[^>]*>([\s\S]*?)<\/body>/i;
      const bodyMatch = finalHtml.match(bodyTagRegex);
      if (bodyMatch) {
        const bodyOpen = finalHtml.slice(bodyMatch.index, bodyMatch.index + bodyMatch[0].indexOf('>') + 1);
        const bodyContent = bodyMatch[1];
        finalHtml = finalHtml.replace(bodyTagRegex,
          `${bodyOpen}\n<div class="shortsite-preview-frame">${bodyContent}</div>\n${editButtonHtml}\n</body>`);
      } else if (finalHtml.includes('<body>')) {
        finalHtml = finalHtml.replace('<body>', `<body>\n<div class="shortsite-preview-frame">`);
        finalHtml = finalHtml.replace('</body>', `</div>\n${editButtonHtml}\n</body>`);
      } else if (finalHtml.includes('<body ')) {
        const openMatch = finalHtml.match(/(<body[^>]*>)/i);
        if (openMatch) {
          finalHtml = finalHtml.replace(openMatch[0], `${openMatch[0]}\n<div class="shortsite-preview-frame">`);
          finalHtml = finalHtml.replace('</body>', `</div>\n${editButtonHtml}\n</body>`);
        }
      } else {
        if (finalHtml.includes('</html>')) {
          finalHtml = finalHtml.replace('</html>', `<body>\n<div class="shortsite-preview-frame"></div>\n${editButtonHtml}\n</body>\n</html>`);
        } else {
          finalHtml = finalHtml + `\n<body>\n<div class="shortsite-preview-frame"></div>\n${editButtonHtml}\n</body>`;
        }
      }
    }

    // Return raw HTML with proper headers
    return new NextResponse(finalHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error loading site:', error);
    return new NextResponse('Error loading site', { status: 500 });
  }
}
