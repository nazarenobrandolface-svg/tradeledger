import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/html';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link2,
  Strikethrough
} from 'lucide-react';

interface RichTextEditorProps {
  /** Sanitized HTML. The component never emits unsanitized markup. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** Called after 500ms of inactivity — used for the "Saved" indicator. */
  onIdle?: () => void;
  /** Called when image files are pasted (screenshots) instead of inserted. */
  onImagePaste?: (files: File[]) => void;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active ?? false}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-40',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground'
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1.5"
      role="toolbar"
      aria-label="Text formatting"
    >
      <ToolbarButton
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <ToolbarButton
        label="Heading 1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <ToolbarButton
        label="Link"
        active={editor.isActive('link')}
        onClick={setLink}
      >
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
  className,
  onIdle,
  onImagePaste
}: RichTextEditorProps) {
  const isExternalUpdate = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The editor is created once; keep the latest callback in a ref so a
  // recreated editor is never required when the prop identity changes.
  const onImagePasteRef = useRef(onImagePaste);
  useEffect(() => {
    onImagePasteRef.current = onImagePaste;
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Placeholder.configure({ placeholder })
    ],
    content: sanitizeHtml(value),
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none',
        'aria-label': 'Note body'
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith('image/')
        );
        if (files.length === 0) return false;
        onImagePasteRef.current?.(files);
        return true;
      }
    },
    onUpdate: ({ editor: e }) => {
      // Never let an external value change fight a user edit.
      isExternalUpdate.current = false;
      onChange(sanitizeHtml(e.isEmpty ? '' : e.getHTML()));
      if (onIdle) {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(onIdle, 500);
      }
    }
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (sanitizeHtml(value) === current) return;
    isExternalUpdate.current = true;
    editor.commands.setContent(sanitizeHtml(value), false);
  }, [value, editor]);

  useEffect(
    () => () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    },
    []
  );

  if (!editor) {
    return (
      <div className={cn('min-h-[240px] rounded-md border bg-card', className)}>
        <div className="skeleton h-8 w-full rounded-none border-b" />
        <div className="space-y-2 p-4">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-md border bg-card', className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
