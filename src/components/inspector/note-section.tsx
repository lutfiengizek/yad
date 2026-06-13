// Inspector not bölümü: ProseMirror (tiptap) editörü, uzun-metin için Merriweather (font-serif).
// İçerik ProseMirror JSON olarak note_set ile kaydedilir (odak kaybında).

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { t } from "@/i18n";
import { api } from "@/lib/api";
import type { FileItem } from "@/lib/api/types";
import { useFileStore } from "@/stores/file-store";

export function NoteSection({ file }: { file: FileItem }) {
  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "font-serif text-sm leading-relaxed min-h-16 focus:outline-none [&_p]:my-1",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    void (async () => {
      const note = await api.noteGet(file.id);
      if (cancelled) return;
      editor.commands.setContent(note ? JSON.parse(note.contentJson) : "");
    })();
    return () => {
      cancelled = true;
    };
  }, [file.id, editor]);

  async function save() {
    if (!editor) return;
    await api.noteSet({
      fileId: file.id,
      contentJson: JSON.stringify(editor.getJSON()),
    });
    void useFileStore.getState().reload();
  }

  return (
    <div className="space-y-2">
      <span className="text-muted-foreground text-xs">{t("inspector.note")}</span>
      <div
        className="focus-within:border-ring rounded-md border px-2 py-1.5"
        onBlur={() => void save()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
