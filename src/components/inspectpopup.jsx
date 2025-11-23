'use client';

import React, { useState, useEffect, useRef } from 'react';
import { XIcon, CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react';

const InspectPopup = React.forwardRef(({ position, onMouseDown, onClose, html, css, js }, ref) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set(['html', 'body']));
  const [size, setSize] = useState({ width: 512, height: 560 }); // 32rem = 512px, 35rem = 560px
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const resizeHandleRef = useRef(null);

  const toggleNode = (path) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const parseHTMLToTree = (htmlString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    
    const createNode = (element, path = '', depth = 0) => {
      if (!element) return null;
      
      // Handle comment nodes
      if (element.nodeType === 8) {
        const commentText = element.textContent || element.nodeValue || '';
        return {
          type: 'comment',
          text: commentText,
          path: `${path}-comment-${depth}`,
          depth,
        };
      }
      
      // Handle text nodes
      if (element.nodeType === 3) {
        const text = element.textContent?.trim();
        if (!text) return null;
        return {
          type: 'text',
          text,
          path: `${path}-text-${depth}`,
          depth,
        };
      }
      
      const tagName = element.tagName?.toLowerCase() || element.nodeName?.toLowerCase();
      if (!tagName) return null;
      
      const index = Array.from(element.parentNode?.children || []).indexOf(element);
      const uniquePath = path ? `${path}-${index}` : `${tagName}-${index}`;
      
      const node = {
        type: 'element',
        tagName,
        attributes: {},
        children: [],
        path: uniquePath,
        depth,
      };
      
      if (element.attributes) {
        Array.from(element.attributes).forEach(attr => {
          node.attributes[attr.name] = attr.value;
        });
      }
      
      // Process all child nodes (including text nodes)
      Array.from(element.childNodes).forEach((child, idx) => {
        const childNode = createNode(child, uniquePath, depth + 1);
        if (childNode) {
          node.children.push(childNode);
        }
      });
      
      return node;
    };
    
    return createNode(doc.documentElement) || createNode(doc.body);
  };

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

  // Resize handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(300, Math.min(1200, resizeStart.width + deltaX));
        const newHeight = Math.max(200, Math.min(800, resizeStart.height + deltaY));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeStart]);

  const renderTreeNode = (node, tree) => {
    if (!node) return null;
    
    // Handle comment nodes
    if (node.type === 'comment') {
      return (
        <div key={node.path} className="select-none">
          <div
            className="flex items-start px-1 py-0.5"
            style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
          >
            <span className="w-4 flex-shrink-0"></span>
            <div className="flex-1 break-words" style={{ color: '#ABABAB' }}>
              &lt;!-- {node.text} --&gt;
            </div>
          </div>
        </div>
      );
    }
    
    // Handle text nodes (only render when not inline)
    if (node.type === 'text') {
      return (
        <div key={node.path} className="select-none">
          <div
            className="flex items-start px-1 py-0.5"
            style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
          >
            <span className="w-4 flex-shrink-0"></span>
            <div className="flex-1 break-words text-[#FE8D5A]">
              {node.text}
            </div>
          </div>
        </div>
      );
    }
    
    const isExpanded = expandedNodes.has(node.path);
    const hasChildren = node.children.length > 0;
    
    // Check if all children are text nodes (for inline display)
    const hasOnlyTextChildren = hasChildren && node.children.every(child => child.type === 'text');
    const inlineText = hasOnlyTextChildren ? node.children.map(c => c.text).join('') : null;

    return (
      <div key={node.path} className="select-none">
        <div
          className="flex items-start px-1 py-0.5 cursor-pointer"
          style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
        >
          {hasChildren && !hasOnlyTextChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.path);
              }}
              className="w-4 h-4 flex items-end justify-center text-white/60 hover:text-white"
            >
              {isExpanded ? <CaretDownIcon weight="fill" size={12} /> : <CaretRightIcon weight="fill" size={12} />}
            </button>
          )}
          {(!hasChildren || hasOnlyTextChildren) && <span className="w-4 flex-shrink-0"></span>}
          <div className="flex-1 break-words">
            <span className="text-[#7CACF8]">&lt;</span><span className="text-[#7CACF8]">{node.tagName}</span>
            {Object.entries(node.attributes).map(([key, value]) => (
              <span key={key} className="text-white/80">
                <span className="text-[#A8C7FA]"> {key}</span>
                <span className="text-[#7CACF8]">="<span className="text-[#FE8D5A]">{value}</span>"</span>
              </span>
            ))}
            <span className="text-[#7CACF8]">&gt;</span>
            {hasOnlyTextChildren && (
              <>
                <span className="text-[#E3E3E3]">{inlineText}</span>
                <span className="text-[#7CACF8]">&lt;</span>
                <span className="text-[#7CACF8]">/</span>
                <span className="text-[#7CACF8]">{node.tagName}</span>
                <span className="text-[#7CACF8]">&gt;</span>
              </>
            )}
            {!hasChildren && !hasOnlyTextChildren && (
              <>
                <span className="text-[#7CACF8]">&lt;</span>
                <span className="text-[#7CACF8]">/</span>
                <span className="text-[#7CACF8]">{node.tagName}</span>
                <span className="text-[#7CACF8]">&gt;</span>
              </>
            )}
          </div>
        </div>
        {hasChildren && !hasOnlyTextChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, tree))}
            <div
              className={`flex items-start px-1 py-0.5`}
              style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
            >
              <span className="w-4 flex-shrink-0"></span>
              <div className="flex-1 break-words">
                <span className="text-[#7CACF8]">&lt;</span>
                <span className="text-[#7CACF8]">/</span>
                <span className="text-[#7CACF8]">{node.tagName}</span>
                <span className="text-[#7CACF8]">&gt;</span>
              </div>
            </div>
          </div>
        )}
        {hasChildren && !hasOnlyTextChildren && !isExpanded && (
          <div
            className={`flex items-start px-1 py-0.5`}
            style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
          >
            <span className="w-4 flex-shrink-0"></span>
            <div className="flex-1 break-words">
              <span className="text-[#7CACF8]">&lt;</span>
              <span className="text-[#7CACF8]">/</span>
              <span className="text-[#7CACF8]">{node.tagName}</span>
              <span className="text-[#7CACF8]">&gt;</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const domTree = getDOMTree();

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 9999,
      }}
      className="bg-[#282828] rounded-xl flex flex-col border border-[#585858] shadow-2xl"
      onMouseDown={onMouseDown}
    >
      <div className="flex justify-between items-center bg-[#3C3C3C] rounded-t-xl px-4 py-2 text-white font-medium inspect-header cursor-move">
        <span>Inspect Elements</span>
        <button
          onClick={onClose}
          className="text-white hover:text-white/80 transition-colors"
        >
          <XIcon size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-sm">
        {domTree ? (
          <div>
            {renderTreeNode(domTree, domTree)}
          </div>
        ) : (
          <div className="text-white/60">No elements to inspect</div>
        )}
      </div>
      {/* Resize handle */}
      <div
        ref={resizeHandleRef}
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-transparent hover:bg-[#3C3C3C]/50 transition-colors"
        style={{
          cursor: isResizing ? 'nwse-resize' : 'nwse-resize',
        }}
      >
        <div className="absolute bottom-1 right-1 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-[#585858]"></div>
        <div className="absolute bottom-0.5 right-0.5 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-[#ABABAB]"></div>
      </div>
    </div>
  );
});

InspectPopup.displayName = 'InspectPopup';

export default InspectPopup;