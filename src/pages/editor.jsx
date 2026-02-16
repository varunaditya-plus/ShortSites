'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SparkleIcon, FloppyDiskIcon, SquareHalfBottomIcon, SquareHalfIcon, KeyIcon, DeviceMobileIcon, DesktopIcon, ArrowsOutIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IoLogoHtml5 } from 'react-icons/io';
import { IoLogoJavascript } from 'react-icons/io5';
import { IoLogoCss3 } from 'react-icons/io';
import { addOrUpdateSite } from '@/lib/auth';
import AiEditor from '@/components/aieditor';
import InspectPopup from '@/components/inspectpopup';
import '../styles/editor.css';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const defaultHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Untitled ShortSite</title>
    <style do-not-remove>[[_CSS_]]</style>
</head>
<body>
    <h1>Write your html here</h1>
    
    
    <script do-not-remove>[[_JS_]]</script>
</body>
</html>`;

const defaultCSS = `body {
    background-color: #1a1a1a;
    color: #fff;
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
}

`;

const defaultJS = `console.log("Hey there!");

`;

export default function Editor() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params?.code;
  const accessCode = searchParams?.get('code');
  const isEditMode = !!code;

  const [html, setHtml] = useState(isEditMode ? '' : defaultHTML);
  const [css, setCss] = useState(isEditMode ? '' : defaultCSS);
  const [js, setJs] = useState(isEditMode ? '' : defaultJS);
  const [activeTab, setActiveTab] = useState('html');
  const [loading, setLoading] = useState(isEditMode);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState(null);
  const [terminalMessages, setTerminalMessages] = useState([]);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalMessages]);
  const [passwordInput, setPasswordInput] = useState('');
  const [isRowLayout, setIsRowLayout] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewportMode, setViewportMode] = useState('full'); // 'full', 'desktop', 'mobile'
  const [viewportScale, setViewportScale] = useState(1);
  const [splitPosition, setSplitPosition] = useState(50); // Percentage (0-100)
  const [showInspectPopup, setShowInspectPopup] = useState(false);
  const [inspectPopupPosition, setInspectPopupPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const inspectPopupRef = useRef(null);
  const previewFrameRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const previewContainerRef = useRef(null);
  const resizerRef = useRef(null);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const mainRef = useRef(null);
  const htmlEditorRef = useRef(null);
  const cssEditorRef = useRef(null);
  const jsEditorRef = useRef(null);
  const aiEditorRef = useRef(null);

  useEffect(() => {
    const loadSite = async () => {
      if (!isEditMode) {
        setLoading(false);
        return;
      }

      try {
        // Build API URL with access code if present
        const apiUrl = accessCode 
          ? `/api/sites/${code}?code=${encodeURIComponent(accessCode)}`
          : `/api/sites/${code}`;

        const response = await fetch(apiUrl);
        const result = await response.json();

        if (!response.ok || !result.data) {
          // Site not found or not authorized - redirect to site view
          router.push(`/s/${code}`);
          return;
        }

        const data = result.data;

        // If authorized (via "sites" cookie or ?code=), load the site. Server sets "sites" cookie when needed.
        if (data.authorized) {
          if (accessCode) {
            addOrUpdateSite(code, accessCode);
          }

          setHtml(data.html || '');
          setCss(data.css || '');
          setJs(data.javascript || '');
          setLoading(false);
        } else {
          // Not authorized - redirect to site view
          router.push(`/s/${code}`);
        }
      } catch (error) {
        console.error('Error loading site:', error);
        setLoading(false);
      }
    };

    loadSite();
  }, [code, accessCode, isEditMode, router]);

  useEffect(() => {
    // Load Monaco theme
    const loadTheme = async () => {
      try {
        const response = await fetch('/monaco_shortsites.json');
        const themeData = await response.json();
        if (window.monaco) {
          window.monaco.editor.defineTheme('shortsites', themeData);
          window.monaco.editor.setTheme('shortsites');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        if (!isEditMode) {
          setLoading(false);
        }
      }
    };

    loadTheme();
  }, [isEditMode]);

  useEffect(() => {
    updatePreview();
  }, [html, css, js]);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Only trigger if in code editor
        if (activeTab === 'html' || activeTab === 'css' || activeTab === 'js') {
          e.preventDefault();
          const editor = activeTab === 'html' ? htmlEditorRef.current : activeTab === 'css' ? cssEditorRef.current : jsEditorRef.current;
          
          if (!editor || !aiEditorRef.current) return;
          
          // Get selection or current line
          const selection = editor.getSelection();
          let selectedText = '';
          let startLine = 0;
          let endLine = 0;
          let baseIndentation = '';
          
          if (selection && !selection.isEmpty()) {
            selectedText = editor.getModel().getValueInRange(selection);
            startLine = selection.startLineNumber - 1;
            endLine = selection.endLineNumber - 1;
            
            const firstLineContent = editor.getModel().getLineContent(selection.startLineNumber);
            const match = firstLineContent.match(/^(\s*)/);
            baseIndentation = match ? match[1] : '';
          } else {
            // User is on a line, get current line
            const position = editor.getPosition();
            if (position) {
              const lineNumber = position.lineNumber - 1;
              const lineContent = editor.getModel().getLineContent(position.lineNumber);
              selectedText = lineContent;
              startLine = lineNumber;
              endLine = lineNumber;
              
              // Get the indentation of the current line
              const match = lineContent.match(/^(\s*)/);
              baseIndentation = match ? match[1] : '';
            }
          }
          
          // Open dialog with proper positioning
          aiEditorRef.current.openAiEditDialog(editor, startLine, endLine, selectedText, baseIndentation);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  useEffect(() => {
    const calculateScale = () => {
      if (viewportMode === 'full' || !previewContainerRef.current) {
        setViewportScale(1);
        return;
      }

      const container = previewContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const availableWidth = containerRect.width - 32; // 16px padding on each side
      const availableHeight = containerRect.height - 32; // 16px padding on each side

      // Skip if container not yet measured
      if (availableWidth <= 0 || availableHeight <= 0) {
        return;
      }

      let viewportWidth, viewportHeight;

      if (viewportMode === 'desktop') {
        viewportWidth = 1440;
        viewportHeight = 810; // 16:9 aspect ratio
      } else if (viewportMode === 'mobile') {
        viewportWidth = 375;
        viewportHeight = 667; // 9:16 aspect ratio (portrait)
      } else {
        setViewportScale(1);
        return;
      }

      // Calculate scale to fit both width and height with padding
      const scaleX = availableWidth / viewportWidth;
      const scaleY = availableHeight / viewportHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

      setViewportScale(scale);
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      calculateScale();
    }, 0);

    // Recalculate on window resize
    const handleResize = () => {
      calculateScale();
    };

    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver for more accurate measurements
    let resizeObserver;
    if (previewContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        calculateScale();
      });
      resizeObserver.observe(previewContainerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [viewportMode, isRowLayout]);

  const handleResizerPointerDown = (e) => {
    e.preventDefault();
    
    if (!resizerRef.current || !mainRef.current) return;

    const mainElement = mainRef.current;
    const rect = mainElement.getBoundingClientRect();
    
    // Store initial position
    if (isRowLayout) {
      lastXRef.current = e.clientX;
    } else {
      lastYRef.current = e.clientY;
    }

    // Capture pointer to receive all events even when outside the element
    resizerRef.current.setPointerCapture(e.pointerId);
    
    // Set cursor and prevent text selection
    document.body.style.cursor = isRowLayout ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizerPointerMove = (e) => {
    if (!resizerRef.current || !mainRef.current) return;
    if (!resizerRef.current.hasPointerCapture(e.pointerId)) return;

    const mainElement = mainRef.current;
    const rect = mainElement.getBoundingClientRect();
    
    let newPosition;
    let delta;

    if (isRowLayout) {
      // Horizontal split (left/right)
      const thisX = e.clientX;
      delta = thisX - lastXRef.current;
      const currentPositionPx = (splitPosition / 100) * rect.width;
      const newPositionPx = Math.max(rect.width * 0.2, Math.min(rect.width * 0.8, currentPositionPx + delta));
      newPosition = (newPositionPx / rect.width) * 100;
      lastXRef.current = thisX;
    } else {
      // Vertical split (top/bottom)
      const thisY = e.clientY;
      delta = thisY - lastYRef.current;
      const currentPositionPx = (splitPosition / 100) * rect.height;
      const newPositionPx = Math.max(rect.height * 0.2, Math.min(rect.height * 0.8, currentPositionPx + delta));
      newPosition = (newPositionPx / rect.height) * 100;
      lastYRef.current = thisY;
    }

    setSplitPosition(newPosition);
  };

  const handleResizerPointerUp = (e) => {
    if (!resizerRef.current) return;
    
    // Release pointer capture
    resizerRef.current.releasePointerCapture(e.pointerId);
    
    // Reset cursor and text selection
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const updatePreview = () => {
    if (!previewFrameRef.current) return;

    try {
      let content = html.replace(/<\/(?!\w+>)/g, '');
      content = content.replace(/<style do-not-remove>[\s\S]*?<\/style>/, `<style>${css}</style>`);
      content = content.replace(/<script do-not-remove>[\s\S]*?<\/script>/, `<script>${js}</script>`);

      const iframe = previewFrameRef.current;
      if (!iframe.contentWindow) return;

      // Use srcdoc for safer iframe content setting
      iframe.srcdoc = content;
    } catch (error) {
      console.error('Error updating preview:', error);
    }
  };

  const handleEditorDidMount = (editor, monaco, tab) => {
    window.monaco = monaco;
    // Store editor reference based on tab
    if (tab === 'html') {
      htmlEditorRef.current = editor;
    } else if (tab === 'css') {
      cssEditorRef.current = editor;
    } else if (tab === 'js') {
      jsEditorRef.current = editor;
    }
    
    // Register Cmd+K / Ctrl+K command in Monaco
    const commandId = `ai-edit-${tab}`;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      // Get selection or current line
      const selection = editor.getSelection();
      let selectedText = '';
      let startLine = 0;
      let endLine = 0;
      let baseIndentation = '';
      
      if (selection && !selection.isEmpty()) {
        // User has selected text
        selectedText = editor.getModel().getValueInRange(selection);
        startLine = selection.startLineNumber - 1; // Convert to 0-based
        endLine = selection.endLineNumber - 1;
        
        // Get the indentation of the first line
        const firstLineContent = editor.getModel().getLineContent(selection.startLineNumber);
        const match = firstLineContent.match(/^(\s*)/);
        baseIndentation = match ? match[1] : '';
      } else {
        // User is on a line, get current line
        const position = editor.getPosition();
        if (position) {
          const lineNumber = position.lineNumber - 1; // Convert to 0-based
          const lineContent = editor.getModel().getLineContent(position.lineNumber);
          selectedText = lineContent;
          startLine = lineNumber;
          endLine = lineNumber;
          
          // Get the indentation of the current line
          const match = lineContent.match(/^(\s*)/);
          baseIndentation = match ? match[1] : '';
        }
      }
      
      // Open dialog with proper positioning
      if (aiEditorRef.current) {
        aiEditorRef.current.openAiEditDialog(editor, startLine, endLine, selectedText, baseIndentation);
      }
    });
    
    // Add click handler to close AI edit dialog when user clicks in editor
    editor.onMouseDown(() => {
      if (aiEditorRef.current && aiEditorRef.current.isOpen()) {
        aiEditorRef.current.closeAiEditDialog();
      }
    });
    
    // Also close on focus (when user clicks into editor)
    editor.onDidFocusEditorText(() => {
      if (aiEditorRef.current && aiEditorRef.current.isOpen()) {
        aiEditorRef.current.closeAiEditDialog();
      }
    });
    
    // Load and set theme if not already loaded
    fetch('/monaco_shortsites.json')
      .then(response => response.json())
      .then(themeData => {
        monaco.editor.defineTheme('shortsites', themeData);
        monaco.editor.setTheme('shortsites');
      })
      .catch(error => console.error('Error loading theme:', error));
  };

  const addTerminalMessage = (message, type = 'info') => {
    setTerminalMessages(prev => [...prev, { message, type, timestamp: Date.now() }]);
  };

  const saveSite = async () => {
    // Show dialog immediately
    setShowModal(true);
    setModalTitle('');
    setTerminalMessages([]);
    
    const formData = new FormData();
    formData.append('html', html);
    formData.append('css', css);
    formData.append('js', js);

    if (isEditMode) {
      formData.append('code', code);

      try {
        addTerminalMessage('$ Uploading changes...', 'info');
        const response = await fetch('/api/update_site', {
          method: 'POST',
          body: formData,
        });

        await new Promise(resolve => setTimeout(resolve, 500));
        addTerminalMessage('$ Processing...', 'info');
        await new Promise(resolve => setTimeout(resolve, 300));

        const data = await response.json();

        if (data.error) {
          addTerminalMessage(`✗ Error: ${data.error}`, 'error');
        } else {
          addTerminalMessage('✓ Site updated successfully!', 'success');
          await new Promise(resolve => setTimeout(resolve, 300));
          const fullUrl = `${window.location.origin}/s/${code}`;
          addTerminalMessage(`→ Visit: ${fullUrl}`, 'link');
          setModalContent({ type: 'link', url: fullUrl });
        }
      } catch (error) {
        addTerminalMessage('✗ Error: Failed to update site', 'error');
      }
    } else {
      addTerminalMessage('$ Creating new site...', 'info');
      await new Promise(resolve => setTimeout(resolve, 300));

      try {
        addTerminalMessage('$ Uploading files...', 'info');
        const response = await fetch('/api/uploadsite', {
          method: 'POST',
          body: formData,
        });

        await new Promise(resolve => setTimeout(resolve, 500));
        addTerminalMessage('$ Processing...', 'info');
        await new Promise(resolve => setTimeout(resolve, 300));

        const data = await response.json();

        if (data.error) {
          addTerminalMessage(`✗ Error: ${data.error}`, 'error');
        } else {
          addTerminalMessage('✓ Site created successfully!', 'success');
          await new Promise(resolve => setTimeout(resolve, 300));
          // Extract code from data.link or construct from origin
          const linkUrl = data.link.startsWith('http') ? data.link : `${window.location.origin}${data.link}`;
          addTerminalMessage(`→ Link: ${linkUrl}`, 'link');
          await new Promise(resolve => setTimeout(resolve, 200));
          addTerminalMessage(`→ Access key: ${data.access_key}`, 'key');
          setModalContent({ 
            type: 'create', 
            url: linkUrl, 
            accessKey: data.access_key 
          });
        }
      } catch (error) {
        addTerminalMessage('✗ Error: Failed to create site', 'error');
      }
    }
  };

  const setPassword = async () => {
    if (!passwordInput.trim()) {
      showMessageModal('Error', 'Please enter an access code');
      return;
    }

    const formData = new FormData();
    formData.append('password', passwordInput);

    try {
      const response = await fetch(`/api/set_password/${code}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.authorized) {
        showMessageModal('Success', 'Access code set successfully!');
        setPasswordInput('');
      } else {
        showMessageModal('Error', data.message || 'Failed to set access code');
      }
    } catch (error) {
      showMessageModal('Error', 'An error occurred');
    }
  };

  const showMessageModal = (title, content) => {
    setModalTitle(title);
    // If content is a string, convert it to a simple message object
    if (typeof content === 'string') {
      setModalContent({ type: 'message', text: content });
    } else {
      setModalContent(content);
    }
    setTerminalMessages([]);
    setShowModal(true);
  };

  const hideMessageModal = () => {
    setShowModal(false);
    setModalTitle('');
    setModalContent(null);
    setTerminalMessages([]);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Your key has been copied to clipboard.');
    } catch (err) {
      alert('Failed to copy: ' + err.message);
    }
  };

  const sendMessage = async () => {
    const message = chatInput.trim();
    if (!message) return;

    const newMessages = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setChatInput('');

    const chatMessages = chatMessagesRef.current;
    if (chatMessages) {
      const userDiv = document.createElement('div');
      userDiv.className = 'p-2 rounded bg-[#1a1a1f] ml-8';
      userDiv.innerHTML = '<span class="font-bold">You: </span><span>' + escapeHtml(message) + '</span>';
      chatMessages.appendChild(userDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, html, css, js }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      const aiMessageDiv = document.createElement('div');
      aiMessageDiv.className = 'p-2 rounded bg-[#894cc6] mr-8';
      aiMessageDiv.id = 'ai-response-' + Date.now();
      const iconSpan = document.createElement('span');
      iconSpan.className = 'font-bold';
      iconSpan.textContent = 'AI: ';
      const contentSpan = document.createElement('span');
      contentSpan.id = 'ai-content-' + Date.now();
      aiMessageDiv.appendChild(iconSpan);
      aiMessageDiv.appendChild(contentSpan);
      if (chatMessages) {
        chatMessages.appendChild(aiMessageDiv);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        let lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.content === '[DONE]') break;

              fullResponse += data.content;
              contentSpan.innerHTML = formatAIResponse(fullResponse);
              if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: fullResponse }]);
    } catch (error) {
      console.error('Error with AI request:', error);
      if (chatMessages) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'p-2 rounded bg-[#894cc6] mr-8 text-red-400';
        errorDiv.innerHTML = '<span class="font-bold">AI: </span><span>[Error: Could not connect to AI service]</span>';
        chatMessages.appendChild(errorDiv);
      }
    }
  };

  const formatAIResponse = (text) => {
    if (!text) return '';

    const codeBlocks = [];
    text = text.replace(/```(\w+)?\s*([\s\S]*?)\s*```/g, function(match, language, code) {
      codeBlocks.push({
        language: language || 'plaintext',
        code: code
      });
      return `%%%CODEBLOCK${codeBlocks.length - 1}%%%`;
    });

    text = text.replace(/\n/g, '<br>');

    codeBlocks.forEach((block, index) => {
      const escapedCode = escapeHtml(block.code);
      const codeHTML = `<pre><code class="language-${block.language}">${escapedCode}</code></pre>`;
      text = text.replace(`%%%CODEBLOCK${index}%%%`, codeHTML);
    });

    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    return text;
  };

  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const handleCodeChange = (tab, newValue) => {
    if (tab === 'html') {
      setHtml(newValue);
    } else if (tab === 'css') {
      setCss(newValue);
    } else {
      setJs(newValue);
    }
  };

  const cycleViewportMode = () => {
    setViewportMode((prev) => {
      if (prev === 'full') return 'desktop';
      if (prev === 'desktop') return 'mobile';
      return 'full';
    });
  };

  const getViewportStyles = () => {
    switch (viewportMode) {
      case 'desktop':
        // 16:9 aspect ratio: 1440px width = 810px height (1440 * 9/16 = 810)
        return {
          width: '1440px',
          height: '810px',
          aspectRatio: '16/9',
          transform: `scale(${viewportScale})`,
          transformOrigin: 'center center',
        };
      case 'mobile':
        // 9:16 aspect ratio (portrait): 375px width = 667px height
        return {
          width: '375px',
          height: '667px',
          aspectRatio: '9/16',
          transform: `scale(${viewportScale})`,
          transformOrigin: 'center center',
        };
      default: // 'full'
        return {
          width: '100%',
          height: '100%',
          transform: 'none',
        };
    }
  };

  const getViewportLabel = () => {
    switch (viewportMode) {
      case 'desktop':
        return 'Desktop';
      case 'mobile':
        return 'Mobile';
      default:
        return 'Full width';
    }
  };

  const getViewportIcon = () => {
    switch (viewportMode) {
      case 'desktop':
        return <DesktopIcon size={16} />;
      case 'mobile':
        return <DeviceMobileIcon size={16} />;
      default:
        return <ArrowsOutIcon size={16} />;
    }
  };

  const commonOptions = {
    fontSize: 14,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    tabSize: 2,
    wordWrap: 'on',
    theme: 'shortsites',
  };

  // Drag handlers for inspect popup
  const handleInspectPopupMouseDown = (e) => {
    const header = e.target.closest('.inspect-header');
    const isButton = e.target.closest('button');
    
    if (header && !isButton) {
      setIsDragging(true);
      const rect = inspectPopupRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && inspectPopupRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setInspectPopupPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Parse HTML to create DOM tree structure
  const parseHTMLToTree = (htmlString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    
    const createNode = (element, path = '') => {
      if (!element || element.nodeType === 3) return null; // Skip text nodes for now
      
      const tagName = element.tagName?.toLowerCase() || element.nodeName?.toLowerCase();
      if (!tagName) return null;
      
      const currentPath = path ? `${path} > ${tagName}` : tagName;
      const index = Array.from(element.parentNode?.children || []).indexOf(element);
      const uniquePath = `${currentPath}:nth-child(${index + 1})`;
      
      const node = {
        tagName,
        attributes: {},
        children: [],
        path: uniquePath,
        element: element,
      };
      
      // Get attributes
      if (element.attributes) {
        Array.from(element.attributes).forEach(attr => {
          node.attributes[attr.name] = attr.value;
        });
      }
      
      // Get children
      Array.from(element.children).forEach(child => {
        const childNode = createNode(child, uniquePath);
        if (childNode) {
          node.children.push(childNode);
        }
      });
      
      return node;
    };
    
    return createNode(doc.documentElement) || createNode(doc.body);
  };

  // Clear highlights in iframe
  const clearHighlights = () => {
    if (!previewFrameRef.current?.contentWindow) return;
    
    try {
      const iframeWindow = previewFrameRef.current.contentWindow;
      const iframeDocument = iframeWindow.document;
      
      iframeDocument.querySelectorAll('.inspect-highlight').forEach(el => {
        el.classList.remove('inspect-highlight');
        el.style.outline = '';
        el.style.outlineOffset = '';
      });
    } catch (e) {
      console.error('Error clearing highlights:', e);
    }
  };

  // Highlight element in iframe
  const highlightElementInIframe = (tagName, attributes = {}) => {
    if (!previewFrameRef.current?.contentWindow) return;
    
    try {
      const iframeWindow = previewFrameRef.current.contentWindow;
      const iframeDocument = iframeWindow.document;
      
      clearHighlights();
      
      try {
        let selector = tagName;
        
        if (attributes.id) {
          selector = `#${attributes.id}`;
        } else if (attributes.class) {
          const classes = attributes.class.split(' ').filter(c => c).map(c => `.${c}`).join('');
          selector = `${tagName}${classes}`;
        }
        
        const elements = iframeDocument.querySelectorAll(selector);
        if (elements.length > 0) {
          const targetElement = elements[0];
          targetElement.classList.add('inspect-highlight');
          targetElement.style.outline = '2px solid #4A9EFF';
          targetElement.style.outlineOffset = '2px';
        } else {
          // Fallback: try to find by tag name only
          const allElements = iframeDocument.querySelectorAll(tagName);
          if (allElements.length > 0) {
            allElements[0].classList.add('inspect-highlight');
            allElements[0].style.outline = '2px solid #4A9EFF';
            allElements[0].style.outlineOffset = '2px';
          }
        }
      } catch (e) {
        console.log('Could not highlight element:', e);
      }
    } catch (e) {
      console.error('Error highlighting element:', e);
    }
  };

  // Inject highlight styles into iframe
  useEffect(() => {
    if (previewFrameRef.current?.contentWindow && showInspectPopup) {
      try {
        const iframeDocument = previewFrameRef.current.contentWindow.document;
        if (!iframeDocument.getElementById('inspect-styles')) {
          const style = iframeDocument.createElement('style');
          style.id = 'inspect-styles';
          style.textContent = `
            .inspect-highlight {
              outline: 2px solid #4A9EFF !important;
              outline-offset: 2px !important;
            }
          `;
          iframeDocument.head.appendChild(style);
        }
      } catch (e) {
        console.error('Error injecting styles:', e);
      }
    }
  }, [showInspectPopup, html, css, js]);

  // Get DOM tree from current HTML
  const getDOMTree = () => {
    try {
      let content = html.replace(/<\/(?!\w+>)/g, '');
      content = content.replace(/<style do-not-remove>[\s\S]*?<\/style>/, `<style>${css}</style>`);
      content = content.replace(/<script do-not-remove>[\s\S]*?<\/script>/, `<script>${js}</script>`);
      return parseHTMLToTree(content);
    } catch (e) {
      console.error('Error parsing HTML:', e);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-foreground text-3xl">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground dark">
      <main ref={mainRef} className={`flex flex-1 overflow-hidden ${isRowLayout ? 'flex-row' : 'flex-col'}`}>
        <div 
          className={`flex flex-col overflow-hidden p-4 ${isRowLayout ? 'pr-0.5' : 'pb-0.5'}`}
          style={isRowLayout ? { width: `${splitPosition}%` } : { height: `${splitPosition}%` }}
        >
          <div>
            <div className="flex items-center gap-2 w-full">
              <a href='/' className='text-lg font-medium mr-1 tracking-tight hover:text-neutral-300 transition'>shortsites</a>
              <div className="inline-flex h-10 items-center justify-center rounded-xl rounded-b-none bg-secondary p-1 text-muted-foreground">
                <button
                  onClick={() => setActiveTab('html')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-normal ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex gap-2 ${
                    activeTab === 'html'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <IoLogoHtml5 className="w-4 h-4" style={{ color: '#E6510B' }} />
                  HTML
                </button>
                <button
                  onClick={() => setActiveTab('css')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-normal ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex gap-2 ${
                    activeTab === 'css'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <IoLogoCss3 className="w-4 h-4" style={{ color: '#42a5f5' }} />
                  CSS
                </button>
                <button
                  onClick={() => setActiveTab('js')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-normal ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex gap-2 ${
                    activeTab === 'js'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <IoLogoJavascript className="w-4 h-4" style={{ color: '#FFCA28' }} />
                  JavaScript
                </button>
              </div>
              <div className="inline-flex h-10 items-center justify-center rounded-xl rounded-b-none bg-secondary p-1 text-muted-foreground">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-normal ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex gap-2 ${
                    activeTab === 'ai'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <SparkleIcon size={16} weight="fill" className="inline-block" style={{ color: '#a86ff3', filter: 'drop-shadow(0 0 5px #9b56f5)' }} />
                  AI
                </button>
              </div><div className="flex-grow"></div>
              <Button onClick={saveSite} className="gap-2 h-8 mb-2 bg-lime-500 hover:bg-lime-600">
                <FloppyDiskIcon size={16} />
                Save
              </Button>
              {isEditMode && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="h-8 w-8 mb-2 border border-white/10">
                      <KeyIcon size={16} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Access Code</DialogTitle>
                      <DialogDescription>
                        Enter a new access code for your ShortSite. This code will be the new code you will use to edit your site.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                      <input
                        type="text"
                        placeholder="Enter access code"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="h-9 px-3 py-2 bg-card border border-input rounded-md text-card-foreground placeholder-muted-foreground outline-none focus:border-white/40"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          await setPassword();
                          setDialogOpen(false);
                        }}
                      >
                        Set Access Code
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <button
                  onClick={() => setIsRowLayout(!isRowLayout)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 mb-2 text-sm font-normal ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex gap-2 text-muted-foreground hover:text-foreground"
                  title={isRowLayout ? 'Switch to column layout' : 'Switch to row layout'}
                >
                  {isRowLayout ? (
                    <SquareHalfBottomIcon weight="fill" size={18} />
                  ) : (
                    <SquareHalfIcon weight="fill" size={18} />
                  )}
                </button>
            </div>
          </div>

          {activeTab === 'html' && (
            <div className="flex-1 overflow-hidden rounded-xl py-1 bg-secondary">
              <MonacoEditor
                height="100%"
                language="html"
                value={html}
                onChange={(value) => setHtml(value || '')}
                options={commonOptions}
                onMount={(editor, monaco) => handleEditorDidMount(editor, monaco, 'html')}
              />
            </div>
          )}

          {activeTab === 'css' && (
            <div className="flex-1 overflow-hidden rounded-xl py-1 bg-secondary">
              <MonacoEditor
                height="100%"
                language="css"
                value={css}
                onChange={(value) => setCss(value || '')}
                options={commonOptions}
                onMount={(editor, monaco) => handleEditorDidMount(editor, monaco, 'css')}
              />
            </div>
          )}

          {activeTab === 'js' && (
            <div className="flex-1 overflow-hidden rounded-xl py-1 bg-secondary">
              <MonacoEditor
                height="100%"
                language="javascript"
                value={js}
                onChange={(value) => setJs(value || '')}
                options={commonOptions}
                onMount={(editor, monaco) => handleEditorDidMount(editor, monaco, 'js')}
              />
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="flex-1 overflow-hidden rounded-xl py-1 bg-secondary">
              <div className="w-full h-full bg-secondary rounded shadow-md flex flex-col">
                <div
                  ref={chatMessagesRef}
                  className="flex-grow overflow-y-auto p-3 space-yl-2 text-sm text-foreground"
                ></div>
                <div className="p-2 border-t border-border flex">
                  <input
                    type="text"
                    placeholder="Ask the AI for help with your site..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-grow bg-card text-card-foreground placeholder-muted-foreground p-2 rounded-l outline-none border border-border"
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-primary hover:opacity-90 text-primary-foreground font-semibold p-2 rounded-r"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resizer */}
        <div
          ref={resizerRef}
          onPointerDown={handleResizerPointerDown}
          onPointerMove={handleResizerPointerMove}
          onPointerUp={handleResizerPointerUp}
          className={`transition-colors flex items-center justify-center group relative z-10 ${
            isRowLayout ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'
          }`}
        >
          <div
            className={`absolute bg-muted-foreground/20 group-hover:bg-muted-foreground/50 transition-colors rounded-full ${
              isRowLayout ? 'w-0.5 h-12' : 'h-0.5 w-12'
            }`}
          />
        </div>

        <div 
          className={`flex flex-col overflow-hidden p-4 ${isRowLayout ? 'pl-0.5' : 'pt-0.5'} relative`}
          style={isRowLayout ? { width: `${100 - splitPosition}%` } : { height: `${100 - splitPosition}%` }}
        >
          <div 
            ref={(el) => {
              previewContainerRef.current = el;
              // Trigger scale calculation when ref is attached
              if (el && viewportMode !== 'full') {
                setTimeout(() => {
                  const containerRect = el.getBoundingClientRect();
                  const availableWidth = containerRect.width - 32;
                  const availableHeight = containerRect.height - 32;
                  
                  if (availableWidth > 0 && availableHeight > 0) {
                    let viewportWidth, viewportHeight;
                    if (viewportMode === 'desktop') {
                      viewportWidth = 1440;
                      viewportHeight = 810;
                    } else if (viewportMode === 'mobile') {
                      viewportWidth = 375;
                      viewportHeight = 667;
                    }
                    if (viewportWidth && viewportHeight) {
                      const scaleX = availableWidth / viewportWidth;
                      const scaleY = availableHeight / viewportHeight;
                      setViewportScale(Math.min(scaleX, scaleY, 1));
                    }
                  }
                }, 0);
              }
            }}
            className={`flex-1 overflow-hidden flex items-center justify-center ${isRowLayout && viewportMode !== 'full' ? 'scale-[1.03]' : ''}`}
          >
            <div style={getViewportStyles()} className={`transition-all duration-200 flex-shrink-0 ${viewportMode === 'full' ? 'w-full h-full' : ''}`}>
              <iframe
                ref={previewFrameRef}
                title="Live Preview"
                className="w-full h-full border border-border rounded-xl shadow-sm bg-secondary"
                sandbox="allow-scripts"
              ></iframe>
            </div>
          </div>
          <div className={`absolute ${isRowLayout ? 'bottom-6 right-6' : 'bottom-6 left-6'} flex gap-2 z-10`}>
            <button
              onClick={cycleViewportMode}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium bg-background text-secondary-foreground hover:bg-muted-foreground/20 border border-border shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
              title={`Current: ${getViewportLabel()}. Click to cycle viewport size.`}
            >
              {getViewportIcon()}
              <span>{getViewportLabel()}</span>
            </button>
            <button
              onClick={() => setShowInspectPopup(!showInspectPopup)}
              className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium border border-border shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer ${
                showInspectPopup 
                  ? 'bg-background text-secondary-foreground hover:bg-muted-foreground/20' 
                  : 'bg-background text-secondary-foreground hover:bg-muted-foreground/20'
              }`}
              title="Inspect page elements"
            >
              <MagnifyingGlassIcon size={16} />
              <span>Inspect page</span>
            </button>
          </div>
        </div>
      </main>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl p-6 pt-2">
          <DialogHeader>
            <DialogTitle className={modalTitle ? '' : 'sr-only'}>
              {modalTitle || 'Save Status'}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-black/20 border border-border rounded-lg p-4 font-mono text-sm">
            <div 
              ref={terminalRef}
              className="space-y-1 min-h-[200px] max-h-[400px] overflow-y-auto"
            >
              {terminalMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`${
                    msg.type === 'error' ? 'text-red-400' :
                    msg.type === 'success' ? 'text-green-400' :
                    msg.type === 'link' ? 'text-blue-400' :
                    msg.type === 'key' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  {msg.message}
                </div>
              ))}
              {terminalMessages.length === 0 && (
                <div className="text-gray-500">Waiting for output...</div>
              )}
            </div>
            {modalContent && (
              <div className="mt-4 pt-4 border-t border-border text-center">
                {modalContent.type === 'link' && (
                  <>
                    <span>LIVE: </span>
                    <a 
                        href={modalContent.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 underline hover:text-blue-300"
                    >
                        {modalContent.url}
                    </a>
                  </>
                )}
                {modalContent.type === 'create' && (
                  <>
                    <div className="mt-2">
                      <a 
                        href={modalContent.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 underline hover:text-blue-300"
                      >
                        {modalContent.url}
                      </a>
                    </div>
                    <div 
                      className="mt-3 p-2 bg-zinc-800 rounded font-mono text-sm cursor-pointer hover:bg-zinc-700 transition-colors"
                      onClick={() => copyToClipboard(modalContent.accessKey)}
                    >
                      Access key: <span className="text-red-400">{modalContent.accessKey}</span>
                    </div>
                    <p className="mt-2 text-sm text-red-500">KEEP THIS SOMEWHERE SAFE. THIS IS USED TO MAKE EDITS TO YOUR SITE.</p>
                  </>
                )}
                {modalContent.type === 'message' && (
                  <p>{modalContent.text}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AiEditor ref={aiEditorRef} htmlEditorRef={htmlEditorRef} cssEditorRef={cssEditorRef} jsEditorRef={jsEditorRef} activeTab={activeTab} html={html} css={css} js={js} onCodeChange={handleCodeChange} />

      {showInspectPopup && (
        <InspectPopup ref={inspectPopupRef} position={inspectPopupPosition} onMouseDown={handleInspectPopupMouseDown} onClose={() => { clearHighlights(); setShowInspectPopup(false); }} html={html} css={css} js={js} />
      )}
    </div>
  );
}

