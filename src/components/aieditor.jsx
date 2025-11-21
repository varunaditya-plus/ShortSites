'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { XIcon } from '@phosphor-icons/react';

const AiEditor = forwardRef(function AiEditor({ htmlEditorRef, cssEditorRef, jsEditorRef, activeTab, html, css, js, onCodeChange }, ref) {
  const [aiEditDialogOpen, setAiEditDialogOpen] = useState(false);
  const [aiEditPrompt, setAiEditPrompt] = useState('');
  const [aiEditLoading, setAiEditLoading] = useState(false);
  const [aiEditPreview, setAiEditPreview] = useState('');
  const [aiEditLines, setAiEditLines] = useState(null);
  const [aiEditBoxPosition, setAiEditBoxPosition] = useState({ top: 0, left: 0 });
  const [aiEditDialogHeight, setAiEditDialogHeight] = useState(60);
  
  const aiEditInputRef = useRef(null);
  const aiEditDialogOpenRef = useRef(false);
  const aiEditTargetLineRef = useRef(null);

  // Update dialog height when loading state changes
  useEffect(() => {
    if (aiEditInputRef.current && aiEditDialogOpen) {
      const textareaHeight = Math.min(aiEditInputRef.current.scrollHeight, 120);
      const verticalPadding = 16;
      const statusTextHeight = aiEditLoading ? 20 : 0;
      const buffer = 4;
      const minHeight = 60;
      const calculatedHeight = Math.max(minHeight, textareaHeight + verticalPadding + statusTextHeight + buffer);
      setAiEditDialogHeight(calculatedHeight);
    }
  }, [aiEditLoading, aiEditDialogOpen]);

  // Calculate and set AI edit dialog position above the selected line
  const calculateAiEditPosition = (editor, targetLineNumber, baseIndentation = '') => {
    if (!editor) return;
    
    const editorContainer = editor.getContainerDomNode();
    const editorRect = editorContainer.getBoundingClientRect();
    const lineTop = editor.getTopForLineNumber(targetLineNumber);
    const scrollTop = editor.getScrollTop();
    const contentLeft = editor.getLayoutInfo().contentLeft;
    
    // Calculate the pixel offset for the indentation
    let indentationOffset = 0;
    
    try {
      const fontInfo = editor.getOption(34); // EditorOption.fontInfo
      if (fontInfo && fontInfo.typicalHalfwidthCharacterWidth) {
        const tabSize = editor.getOption(59); // EditorOption.tabSize
        let totalWidth = 0;
        
        for (let i = 0; i < baseIndentation.length; i++) {
          if (baseIndentation[i] === '\t') {
            totalWidth += tabSize * fontInfo.typicalHalfwidthCharacterWidth;
          } else {
            totalWidth += fontInfo.typicalHalfwidthCharacterWidth;
          }
        }
        
        indentationOffset = totalWidth;
      } else {
        const tabSize = editor.getOption(59) || 2;
        let totalWidth = 0;
        const charWidth = 7;
        
        for (let i = 0; i < baseIndentation.length; i++) {
          if (baseIndentation[i] === '\t') {
            totalWidth += tabSize * charWidth;
          } else {
            totalWidth += charWidth;
          }
        }
        
        indentationOffset = totalWidth;
      }
    } catch (e) {
      const tabSize = 2;
      let totalWidth = 0;
      const charWidth = 7;
      
      for (let i = 0; i < baseIndentation.length; i++) {
        if (baseIndentation[i] === '\t') {
          totalWidth += tabSize * charWidth;
        } else {
          totalWidth += charWidth;
        }
      }
      
      indentationOffset = totalWidth;
    }
    
    const boxTop = editorRect.top + lineTop - scrollTop - 50;
    const boxLeft = editorRect.left + contentLeft + indentationOffset;
    
    const boxHeight = 60;
    const finalTop = Math.max(10, Math.min(boxTop, window.innerHeight - boxHeight - 10));
    const finalLeft = Math.max(10, boxLeft);
    
    setAiEditBoxPosition({ top: finalTop, left: finalLeft });
  };

  // Open AI edit dialog with proper positioning
  const openAiEditDialog = (editor, startLine, endLine, selectedText, baseIndentation) => {
    if (!editor) return;
    
    const targetLineNumber = startLine + 1;
    aiEditTargetLineRef.current = { editor, targetLineNumber, baseIndentation };
    
    calculateAiEditPosition(editor, targetLineNumber, baseIndentation);
    
    setAiEditLines({ startLine, endLine, selectedText, baseIndentation });
    setAiEditPrompt('');
    setAiEditPreview('');
    setAiEditDialogHeight(60);
    aiEditDialogOpenRef.current = true;
    setAiEditDialogOpen(true);
    
    const updatePosition = () => {
      if (aiEditDialogOpenRef.current && aiEditTargetLineRef.current) {
        calculateAiEditPosition(
          aiEditTargetLineRef.current.editor,
          aiEditTargetLineRef.current.targetLineNumber,
          aiEditTargetLineRef.current.baseIndentation
        );
      }
    };
    
    editor.onDidScrollChange(updatePosition);
    
    setTimeout(() => {
      if (aiEditInputRef.current) {
        aiEditInputRef.current.focus();
        aiEditInputRef.current.style.height = 'auto';
        const textareaHeight = Math.min(aiEditInputRef.current.scrollHeight, 120);
        aiEditInputRef.current.style.height = textareaHeight + 'px';
        
        const verticalPadding = 16;
        const buffer = 4;
        const minHeight = 60;
        const calculatedHeight = Math.max(minHeight, textareaHeight + verticalPadding + buffer);
        setAiEditDialogHeight(calculatedHeight);
      }
    }, 0);
  };

  // Close AI edit dialog
  const closeAiEditDialog = () => {
    aiEditDialogOpenRef.current = false;
    aiEditTargetLineRef.current = null;
    setAiEditDialogOpen(false);
    setAiEditPrompt('');
    setAiEditPreview('');
    setAiEditLines(null);
  };

  // Apply proper indentation to generated code relative to the original position
  const applyIndentation = (code, baseIndentation) => {
    if (!baseIndentation || !code) return code;
    
    const lines = code.split('\n');
    
    let minIndent = Infinity;
    for (const line of lines) {
      if (line.trim().length > 0) {
        const match = line.match(/^(\s*)/);
        const indent = match ? match[1].length : 0;
        minIndent = Math.min(minIndent, indent);
      }
    }
    
    if (minIndent === Infinity) minIndent = 0;
    
    const indentedLines = lines.map((line) => {
      if (line.trim().length === 0) { return baseIndentation; }
      const withoutMinIndent = line.substring(minIndent);
      return baseIndentation + withoutMinIndent;
    });
    
    return indentedLines.join('\n');
  };

  const handleAiEditSubmit = async () => {
    const prompt = aiEditPrompt.trim();
    if (!prompt || !aiEditLines) return;
    
    setAiEditLoading(true);
    setAiEditPreview('');
    
    const currentCode = activeTab === 'html' ? html : activeTab === 'css' ? css : js;
    
    const editor = activeTab === 'html' ? htmlEditorRef.current : 
                   activeTab === 'css' ? cssEditorRef.current : 
                   jsEditorRef.current;
    
    if (!editor) {
      setAiEditLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, fullCode: currentCode, selectedCode: aiEditLines.selectedText, language: activeTab, startLine: aiEditLines.startLine, endLine: aiEditLines.endLine }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let linesMatch = null;
      let codeContent = '';
      let foundLinesMarker = false;
      let rawContentBuffer = '';
      let editRange = null;
      let lastUpdateTime = 0;
      const UPDATE_THROTTLE_MS = 50;

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

              const content = data.content;
              rawContentBuffer += content;
              
              if (!foundLinesMarker) {
                const linesIndex = rawContentBuffer.indexOf('LINES::');
                if (linesIndex !== -1) {
                  const afterLines = rawContentBuffer.substring(linesIndex);
                  const newlineAfterLines = afterLines.indexOf('\n');
                  if (newlineAfterLines !== -1) {
                    const linesMarker = afterLines.substring(0, newlineAfterLines).trim();
                    const match = linesMarker.match(/LINES::(\d+)-(\d+)/);
                    if (match) {
                      linesMatch = { start: parseInt(match[1]), end: parseInt(match[2]) };
                      foundLinesMarker = true;
                      const codeAfterMarker = afterLines.substring(newlineAfterLines + 1);
                      codeContent = codeAfterMarker;
                      
                      const model = editor.getModel();
                      const startLineNum = linesMatch.start + 1;
                      const originalEndLineNum = linesMatch.end + 1;
                      const totalLines = model.getLineCount();
                      const actualStartLine = Math.max(1, Math.min(startLineNum, totalLines));
                      const actualEndLine = Math.max(actualStartLine, Math.min(originalEndLineNum, totalLines));
                      const endColumn = model.getLineMaxColumn(actualEndLine);
                      
                      editRange = {
                        startLineNumber: actualStartLine,
                        startColumn: 1,
                        endLineNumber: actualEndLine,
                        endColumn: endColumn
                      };
                      
                      if (codeContent) {
                        let cleanCode = codeContent;
                        if (aiEditLines?.baseIndentation) {
                          cleanCode = applyIndentation(cleanCode, aiEditLines.baseIndentation);
                        }
                        
                        editor.executeEdits('ai-edit-stream', [{
                          range: editRange,
                          text: cleanCode
                        }]);
                        
                        const newModel = editor.getModel();
                        const newEndLine = editRange.startLineNumber + cleanCode.split('\n').length - 1;
                        editRange = {
                          ...editRange,
                          endLineNumber: newEndLine,
                          endColumn: newModel.getLineMaxColumn(newEndLine)
                        };
                      }
                      
                      setAiEditPreview(codeContent);
                    }
                  }
                }
              } else {
                codeContent += content;
                setAiEditPreview(codeContent);
                
                const now = Date.now();
                if (now - lastUpdateTime >= UPDATE_THROTTLE_MS && editRange) {
                  let cleanCode = codeContent;
                  
                  cleanCode = cleanCode.replace(/^```[\w]*\n?/gm, '');
                  cleanCode = cleanCode.replace(/\n?```$/gm, '');
                  
                  if (aiEditLines?.baseIndentation) {
                    cleanCode = applyIndentation(cleanCode, aiEditLines.baseIndentation);
                  }
                  
                  editor.executeEdits('ai-edit-stream', [{
                    range: editRange,
                    text: cleanCode
                  }]);
                  
                  const newModel = editor.getModel();
                  const newEndLine = editRange.startLineNumber + cleanCode.split('\n').length - 1;
                  editRange = {
                    ...editRange,
                    endLineNumber: newEndLine,
                    endColumn: newModel.getLineMaxColumn(newEndLine)
                  };
                  
                  lastUpdateTime = now;
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      if (linesMatch && codeContent && editRange) {
        const model = editor.getModel();
        
        let finalCode = codeContent.trimEnd();
        
        finalCode = finalCode.replace(/^```[\w]*\n?/gm, '');
        finalCode = finalCode.replace(/\n?```$/gm, '');
        finalCode = finalCode.replace(/^```\n?/gm, '');
        finalCode = finalCode.replace(/\n?```$/gm, '');
        finalCode = finalCode.trimEnd();
        
        if (aiEditLines?.baseIndentation) {
          finalCode = applyIndentation(finalCode, aiEditLines.baseIndentation);
        }
        
        const currentEndLine = editRange.startLineNumber + finalCode.split('\n').length - 1;
        const finalRange = {
          startLineNumber: editRange.startLineNumber,
          startColumn: 1,
          endLineNumber: currentEndLine,
          endColumn: model.getLineMaxColumn(currentEndLine)
        };
        
        editor.executeEdits('ai-edit-final', [{
          range: finalRange,
          text: finalCode
        }]);
        
        const newValue = model.getValue();
        if (onCodeChange) {
          onCodeChange(activeTab, newValue);
        }
      }
      
      setAiEditLoading(false);
      closeAiEditDialog();
    } catch (error) {
      console.error('Error with AI edit request:', error);
      setAiEditLoading(false);
    }
  };

  // Expose methods for parent component
  useImperativeHandle(ref, () => ({
    openAiEditDialog,
    closeAiEditDialog,
    isOpen: () => aiEditDialogOpenRef.current
  }));

  return (
    <>
      {aiEditDialogOpen && (
        <div
          className="fixed z-50 rounded-lg border"
          style={{
            top: `${aiEditBoxPosition.top - 12.5}px`,
            left: `${aiEditBoxPosition.left}px`,
            height: `${aiEditDialogHeight}px`,
            backgroundColor: '#1F1F1F',
            borderColor: '#535353',
            minWidth: '450px',
            maxWidth: '600px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
            transition: 'height 0.1s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col py-2 pr-3 pl-4 h-full">
            <div className="flex flex-row items-start justify-between gap-3 h-full">
              <div className="flex-1 flex flex-col h-full">
                <textarea
                  ref={aiEditInputRef}
                  className="h-full bg-transparent text-sm text-white placeholder:text-[#5C5C5C] outline-none resize-none"
                  placeholder="Edit selected code"
                  value={aiEditPrompt}
                  onChange={(e) => setAiEditPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAiEditSubmit();
                    } else if (e.key === 'Escape') {
                      closeAiEditDialog();
                    }
                  }}
                  disabled={aiEditLoading}
                  style={{
                    overflowY: 'auto',
                  }}
                  onInput={(e) => {
                    const textareaHeight = e.target.scrollHeight;
                    const verticalPadding = 16;
                    const statusTextHeight = aiEditLoading ? 20 : 0;
                    const buffer = 4;
                    const minHeight = 60;
                    const calculatedHeight = Math.max(minHeight, textareaHeight + verticalPadding + statusTextHeight + buffer);
                    
                    setAiEditDialogHeight(calculatedHeight);
                  }}
                />
                {aiEditLoading && (
                  <div className="text-xs text-[#9E9E9E] mt-1 flex-shrink-0">
                    Generating...
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center justify-between gap-1">
                <button
                  onClick={closeAiEditDialog}
                  className="text-base text-[#5C5C5C] hover:text-white transition-colors flex items-center justify-center mb-1"
                  disabled={aiEditLoading}
                >
                  <XIcon size={14} weight="bold" />
                </button>
                <button
                  onClick={handleAiEditSubmit}
                  disabled={!aiEditPrompt.trim() || aiEditLoading}
                  className="rounded-full bg-white text-black w-5 h-5 flex items-center justify-center text-sm hover:bg-gray-100 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default AiEditor;