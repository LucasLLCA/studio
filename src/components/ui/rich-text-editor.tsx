"use client";

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Code,
  Heading2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  editorClassName?: string;
}

interface ToolbarButtonProps {
  editor: Editor | null;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  className?: string;
}

function ToolbarButton({
  editor,
  isActive,
  onClick,
  icon,
  title,
  className,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!editor}
      title={title}
      className={cn(
        'h-8 w-8 p-1 rounded border transition-colors flex items-center justify-center',
        isActive
          ? 'bg-primary text-primary-foreground border-primary'
          : 'border-border hover:bg-accent hover:border-primary/50 text-muted-foreground hover:text-foreground',
        !editor && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [, setRenderTrigger] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => {
      setRenderTrigger(c => c + 1);
    };

    editor.on('update', updateHandler);
    editor.on('selectionUpdate', updateHandler);
    editor.on('focus', updateHandler);
    editor.on('blur', updateHandler);

    return () => {
      editor.off('update', updateHandler);
      editor.off('selectionUpdate', updateHandler);
      editor.off('focus', updateHandler);
      editor.off('blur', updateHandler);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex gap-1 flex-wrap p-1.5 border border-input rounded-md bg-muted/30">
      <ToolbarButton
        editor={editor}
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        icon={<Bold className="h-4 w-4" />}
        title="Negrito (Ctrl+B)"
      />
      <ToolbarButton
        editor={editor}
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        icon={<Italic className="h-4 w-4" />}
        title="Itálico (Ctrl+I)"
      />
      <ToolbarButton
        editor={editor}
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        icon={<Strikethrough className="h-4 w-4" />}
        title="Tachado"
      />

      <div className="border-l border-border mx-0.5" />

      <ToolbarButton
        editor={editor}
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        icon={<List className="h-4 w-4" />}
        title="Lista com marcadores"
      />
      <ToolbarButton
        editor={editor}
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        icon={<ListOrdered className="h-4 w-4" />}
        title="Lista numerada"
      />

      <div className="border-l border-border mx-0.5" />

      <ToolbarButton
        editor={editor}
        isActive={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        icon={<Code className="h-4 w-4" />}
        title="Bloco de código"
      />
      <ToolbarButton
        editor={editor}
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        icon={<Heading2 className="h-4 w-4" />}
        title="Heading 2"
      />
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  onSubmit,
  placeholder = 'Escreva uma observação... use @ para mencionar',
  className,
  editorClassName,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        bulletList: {
          keepMarks: true,
        },
        orderedList: {
          keepMarks: true,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'focus:outline-none w-full min-h-[60px] max-h-[200px] overflow-y-auto rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          editorClassName
        ),
      },
      handleKeyDown: (_view: any, event: KeyboardEvent): boolean => {
        // Ctrl+Enter ou Cmd+Enter para enviar
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          onSubmit?.();
          return true;
        }
        return false;
      },
    },
  });

  if (!editor) {
    return <div className="h-10 bg-muted rounded animate-pulse" />;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <EditorToolbar editor={editor} />
      <div className="relative">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
