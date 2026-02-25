"use client";

import React, { useRef, useCallback } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface ToolbarButton {
  label: string;
  command: string;
  argument?: string;
  icon: React.ReactNode;
}

const toolbar_buttons: ToolbarButton[] = [
  {
    label: "Bold",
    command: "bold",
    icon: <span className="font-bold">B</span>,
  },
  {
    label: "Italic",
    command: "italic",
    icon: <span className="italic">I</span>,
  },
  {
    label: "Link",
    command: "createLink",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    label: "Attachment",
    command: "attachment",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
    ),
  },
  {
    label: "Heading",
    command: "formatBlock",
    argument: "H1",
    icon: <span className="font-bold text-xs">H1</span>,
  },
  {
    label: "Blockquote",
    command: "formatBlock",
    argument: "BLOCKQUOTE",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="15" y2="18" />
      </svg>
    ),
  },
  {
    label: "Code Block",
    command: "formatBlock",
    argument: "PRE",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    label: "Bullet List",
    command: "insertUnorderedList",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="9" y1="6" x2="20" y2="6" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="4" cy="6" r="1.5" fill="currentColor" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" />
        <circle cx="4" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Ordered List",
    command: "insertOrderedList",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="10" y1="6" x2="21" y2="6" />
        <line x1="10" y1="12" x2="21" y2="12" />
        <line x1="10" y1="18" x2="21" y2="18" />
        <text x="2" y="8" fontSize="8" fill="currentColor" fontFamily="sans-serif">1</text>
        <text x="2" y="14" fontSize="8" fill="currentColor" fontFamily="sans-serif">2</text>
        <text x="2" y="20" fontSize="8" fill="currentColor" fontFamily="sans-serif">3</text>
      </svg>
    ),
  },
  {
    label: "Undo",
    command: "undo",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    ),
  },
  {
    label: "Redo",
    command: "redo",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    ),
  },
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Type your message here...",
}) => {
  const editor_ref = useRef<HTMLDivElement>(null);

  const executeCommand = useCallback(
    (command: string, argument?: string) => {
      if (command === "attachment") {
        return;
      }

      if (command === "createLink") {
        const url = prompt("Enter URL:");
        if (url) {
          document.execCommand(command, false, url);
        }
        return;
      }

      document.execCommand(command, false, argument);
      editor_ref.current?.focus();
    },
    []
  );

  const handleInput = useCallback(() => {
    if (editor_ref.current) {
      onChange(editor_ref.current.innerHTML);
    }
  }, [onChange]);

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-700 focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10 dark:focus-within:border-brand-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900">
        {toolbar_buttons.map((button, index) => (
          <button
            key={index}
            type="button"
            title={button.label}
            onClick={() => executeCommand(button.command, button.argument)}
            className="flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            {button.icon}
          </button>
        ))}
      </div>

      {/* Editor Area */}
      <div
        ref={editor_ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="min-h-[200px] px-4 py-3 text-sm text-gray-800 dark:text-white/90 bg-white dark:bg-gray-900 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500 empty:before:pointer-events-none [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_pre]:bg-gray-100 [&_pre]:dark:bg-gray-800 [&_pre]:p-3 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-sm [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-brand-500 [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
};

export default RichTextEditor;
