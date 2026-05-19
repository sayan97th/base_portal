"use client";

import React, { useRef, useCallback, useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Type your message here...",
  minHeight = "180px",
}) => {
  const editor_ref = useRef<HTMLDivElement>(null);
  // Tracks the last HTML value that came from internal user input.
  // When the parent updates `value` to match this, we skip the DOM write
  // so the cursor position is never disturbed.
  const internal_value = useRef<string | null>(null);

  useEffect(() => {
    if (!editor_ref.current) return;

    if (internal_value.current === null) {
      // First mount — set initial content
      editor_ref.current.innerHTML = value || "";
      internal_value.current = value || "";
      return;
    }

    // Only update the DOM when the change comes from outside (e.g. form reset)
    if (value !== internal_value.current) {
      editor_ref.current.innerHTML = value || "";
      internal_value.current = value || "";
      // Move cursor to end after external update
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor_ref.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editor_ref.current) return;
    const html = editor_ref.current.innerHTML;
    internal_value.current = html; // must be set before onChange fires
    onChange(html);
  }, [onChange]);

  const execCommand = useCallback(
    (command: string, argument?: string) => {
      if (command === "createLink") {
        const url = prompt("Enter URL:");
        if (url) document.execCommand("createLink", false, url);
      } else {
        document.execCommand(command, false, argument);
      }
      editor_ref.current?.focus();
      handleInput();
    },
    [handleInput]
  );

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 focus-within:border-brand-400 focus-within:ring-3 focus-within:ring-brand-500/10 dark:focus-within:border-brand-700 overflow-hidden bg-white dark:bg-gray-900 transition-all">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 border-b border-gray-100 dark:border-gray-800 px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50">
        <ToolbarGroup>
          <ToolbarBtn label="Bold" onClick={() => execCommand("bold")}>
            <span className="font-bold text-xs">B</span>
          </ToolbarBtn>
          <ToolbarBtn label="Italic" onClick={() => execCommand("italic")}>
            <span className="italic text-xs">I</span>
          </ToolbarBtn>
          <ToolbarBtn label="Underline" onClick={() => execCommand("underline")}>
            <span className="underline text-xs">U</span>
          </ToolbarBtn>
        </ToolbarGroup>

        <Divider />

        <ToolbarGroup>
          <ToolbarBtn label="Bullet List" onClick={() => execCommand("insertUnorderedList")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
              <circle cx="4" cy="6" r="1.5" fill="currentColor" /><circle cx="4" cy="12" r="1.5" fill="currentColor" /><circle cx="4" cy="18" r="1.5" fill="currentColor" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn label="Numbered List" onClick={() => execCommand("insertOrderedList")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
              <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1.</text>
              <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2.</text>
              <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3.</text>
            </svg>
          </ToolbarBtn>
          <ToolbarBtn label="Blockquote" onClick={() => execCommand("formatBlock", "BLOCKQUOTE")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
            </svg>
          </ToolbarBtn>
        </ToolbarGroup>

        <Divider />

        <ToolbarGroup>
          <ToolbarBtn label="Insert Link" onClick={() => execCommand("createLink")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn label="Code Block" onClick={() => execCommand("formatBlock", "PRE")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </ToolbarBtn>
        </ToolbarGroup>

        <Divider />

        <ToolbarGroup>
          <ToolbarBtn label="Undo" onClick={() => execCommand("undo")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn label="Redo" onClick={() => execCommand("redo")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </ToolbarBtn>
        </ToolbarGroup>
      </div>

      {/* Editable area — no dangerouslySetInnerHTML to preserve cursor */}
      <div
        ref={editor_ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight }}
        dir="ltr"
        className="px-4 py-3 text-sm text-gray-800 dark:text-white/90 outline-none
          empty:before:content-[attr(data-placeholder)]
          empty:before:text-gray-400 dark:empty:before:text-gray-500
          empty:before:pointer-events-none
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2
          [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 dark:[&_blockquote]:border-gray-600
          [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-600 dark:[&_blockquote]:text-gray-400
          [&_pre]:bg-gray-100 dark:[&_pre]:bg-gray-800 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
          [&_a]:text-brand-500 [&_a]:underline [&_a]:hover:text-brand-600"
      />
    </div>
  );
};

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />;
}

function ToolbarBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor blur before execCommand
        onClick();
      }}
      className="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      {children}
    </button>
  );
}

export default RichTextEditor;
