import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useCallback, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { sanitizeChapterHtml } from "@/lib/sanitizeChapterHtml";

type ChapterRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

function emptyDoc(): string {
  return "<p></p>";
}

export function ChapterRichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "",
}: ChapterRichTextEditorProps) {
  const { t } = useTranslation();
  const initial = sanitizeChapterHtml(value) || emptyDoc();

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        horizontalRule: false,
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-obra-blue-700 underline underline-offset-2",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: initial,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "obra-rich-editor__content focus:outline-none",
        "aria-label": t("wizard.content.chapters.rte.bodyAria"),
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  }, [t]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("wizard.content.chapters.rte.linkPrompt"), prev ?? "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  }, [editor, t]);

  if (!editor) {
    return (
      <div
        className="min-h-[12rem] rounded-xl border border-obra-neutral-200 bg-white px-4 py-3 font-body text-sm text-obra-neutral-400"
        aria-hidden
      >
        …
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-card border border-obra-neutral-200 bg-white transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "focus-within:border-obra-blue-700 focus-within:ring-2 focus-within:ring-obra-blue-700/20",
      ].join(" ")}
    >
      <div
        role="toolbar"
        aria-label={t("wizard.content.chapters.rte.toolbarAria")}
        className="flex flex-wrap gap-1 border-b border-obra-neutral-200 px-2 py-1.5"
      >
        <ToolbarButton
          pressed={editor.isActive("bold")}
          disabled={disabled || !editor.can().chain().focus().toggleBold().run()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label={t("wizard.content.chapters.rte.bold")}
        >
          <Bold className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("italic")}
          disabled={disabled || !editor.can().chain().focus().toggleItalic().run()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label={t("wizard.content.chapters.rte.italic")}
        >
          <Italic className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("underline")}
          disabled={disabled || !editor.can().chain().focus().toggleUnderline().run()}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          label={t("wizard.content.chapters.rte.underline")}
        >
          <UnderlineIcon className="size-4" aria-hidden />
        </ToolbarButton>
        <span className="mx-0.5 w-px self-stretch bg-obra-neutral-200" aria-hidden />
        <ToolbarButton
          pressed={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label={t("wizard.content.chapters.rte.heading2")}
        >
          <Heading2 className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          label={t("wizard.content.chapters.rte.heading3")}
        >
          <Heading3 className="size-4" aria-hidden />
        </ToolbarButton>
        <span className="mx-0.5 w-px self-stretch bg-obra-neutral-200" aria-hidden />
        <ToolbarButton
          pressed={editor.isActive("bulletList")}
          disabled={disabled || !editor.can().chain().focus().toggleBulletList().run()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label={t("wizard.content.chapters.rte.bulletList")}
        >
          <List className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("orderedList")}
          disabled={disabled || !editor.can().chain().focus().toggleOrderedList().run()}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label={t("wizard.content.chapters.rte.orderedList")}
        >
          <ListOrdered className="size-4" aria-hidden />
        </ToolbarButton>
        <span className="mx-0.5 w-px self-stretch bg-obra-neutral-200" aria-hidden />
        <ToolbarButton
          pressed={editor.isActive("link")}
          disabled={disabled}
          onClick={setLink}
          label={t("wizard.content.chapters.rte.link")}
        >
          <LinkIcon className="size-4" aria-hidden />
        </ToolbarButton>
      </div>
      <div className="min-h-[12rem] max-h-[min(32rem,55vh)] overflow-y-auto px-5 py-4">
        <EditorContent editor={editor} className="obra-rich-editor font-body text-sm text-obra-blue-950" />
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  pressed,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-md p-2 text-obra-neutral-600 transition-colors",
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-obra-blue-50 hover:text-obra-blue-950",
        pressed ? "bg-obra-blue-100 text-obra-blue-950" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
