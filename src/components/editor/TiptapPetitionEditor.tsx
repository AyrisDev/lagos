'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Pilcrow,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  RemoveFormatting,
  BookOpen,
} from 'lucide-react';
import { MevzuatInsertModal } from './MevzuatInsertModal';

interface TiptapPetitionEditorProps {
  content: string;
  onChange: (content: string, plainText: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

// Convert plain text to paragraphs with line breaks preserved
function formatInitialContent(text: string): string {
  if (!text) return '<p></p>';
  if (text.startsWith('<p>') || text.startsWith('<h1>') || text.startsWith('<div>') || text.startsWith('<h2') || text.includes('</p>')) {
    return text;
  }
  // Convert double newlines to paragraphs, single newlines to br
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('');
  return paragraphs || '<p></p>';
}

export function TiptapPetitionEditor({
  content,
  onChange,
  readOnly = false,
}: TiptapPetitionEditorProps) {
  const [isMevzuatModalOpen, setIsMevzuatModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
    ],
    content: formatInitialContent(content),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(html, text);
    },
    editorProps: {
      attributes: {
        class: 'tiptap-prosemirror-paper focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 border-none outline-none text-[14px] leading-[1.8] font-sans select-text min-h-[750px]',
      },
    },
    immediatelyRender: false,
  });

  // Synchronize when content changes externally (AI generation or selecting a draft)
  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    const formatted = formatInitialContent(content);
    if (content !== currentHTML && formatted !== currentHTML && editor.getText().trim() !== content.trim()) {
      editor.commands.setContent(formatted);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col w-full h-full bg-transparent">
      {/* Üst Sabit Araç Çubuğu (Toolbar) */}
      <div className="sticky top-0 z-10 bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-divider)] px-4 py-2 flex flex-wrap items-center justify-between gap-1.5 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          {/* Metin Stilleri */}
          <div className="flex items-center gap-0.5 border-r border-[var(--color-divider)] pr-1.5 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('bold')
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Kalın (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('italic')
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="İtalik (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('underline')
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Altı Çizili (Ctrl+U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('strike')
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Üstü Çizili"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
          </div>

          {/* Başlıklar & Paragraf */}
          <div className="flex items-center gap-0.5 border-r border-[var(--color-divider)] pr-1.5 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={`p-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                editor.isActive('paragraph') && !editor.isActive('heading')
                  ? 'bg-[#3B82F6]/15 text-[#3B82F6] font-bold border border-[#3B82F6]/30'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Normal Metin / Paragraf"
            >
              <Pilcrow className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Ana Başlık (Mahkeme / Konu)"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Alt Başlık (Açıklamalar / Deliller)"
            >
              <Heading2 className="w-4 h-4" />
            </button>
          </div>

          {/* Hizalama */}
          <div className="flex items-center gap-0.5 border-r border-[var(--color-divider)] pr-1.5 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive({ textAlign: 'left' })
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Sola Hizala"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive({ textAlign: 'center' })
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Ortala (Mahkeme Başlığı)"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive({ textAlign: 'right' })
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Sağa Hizala (Vekil İmzası)"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive({ textAlign: 'justify' })
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="İki Yana Yasla"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          {/* Listeler & Alıntı */}
          <div className="flex items-center gap-0.5 border-r border-[var(--color-divider)] pr-1.5 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('bulletList')
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Madde İşaretli Liste"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('orderedList')
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Numaralı Liste (1, 2, 3...)"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('blockquote')
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)]'
              }`}
              title="Hukuki İçtihat / Yargıtay Alıntısı"
            >
              <Quote className="w-4 h-4" />
            </button>
          </div>

          {/* Biçimi Temizle */}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)] transition-all cursor-pointer mr-1"
            title="Biçimlendirmeyi Temizle"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>

          {/* Mevzuat Ekle Butonu */}
          <button
            type="button"
            onClick={() => setIsMevzuatModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 transition-all cursor-pointer shadow-sm ml-1"
            title="Resmi Kanun Maddesi Alıntıla (26.900+ Madde)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mevzuat Ekle</span>
          </button>
        </div>

        {/* Geri / İleri Al */}
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)] disabled:opacity-25 transition-all cursor-pointer"
            title="Geri Al (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-base)] disabled:opacity-25 transition-all cursor-pointer"
            title="İleri Al (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* A4 Kağıt Düzenleme Alanı */}
      <div className="flex-1 overflow-y-auto cyber-juris-scroll p-3 sm:p-5 md:p-8 bg-[var(--color-bg-base)]">
        <div className="w-full max-w-[780px] mx-auto bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl px-6 py-8 sm:px-10 sm:py-12 md:px-14 md:py-12 shadow-lg text-[var(--color-text)] font-sans min-h-full h-fit mb-16">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Mevzuat Arama ve Alıntı Ekleme Modalı */}
      <MevzuatInsertModal
        isOpen={isMevzuatModalOpen}
        onClose={() => setIsMevzuatModalOpen(false)}
        onInsert={(html) => {
          editor.chain().focus().insertContent(html).run();
        }}
      />
    </div>
  );
}
