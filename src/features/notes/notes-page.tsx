"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Edit3,
  FilePlus2,
  FileText,
  Save,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SegmentedControl,
} from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils";

export function NotesPage() {
  const { snapshot, mutate, busy } = useApp();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("note");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(
    requestedId ?? snapshot.notes[0]?.id ?? "new",
  );
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const selected =
    snapshot.notes.find((note) => note.id === selectedId) ?? null;
  const [title, setTitle] = useState(selected?.title ?? "");
  const [content, setContent] = useState(selected?.content ?? "");
  const [tags, setTags] = useState(selected?.tags.join(", ") ?? "");
  const notes = useMemo(
    () =>
      snapshot.notes.filter((note) =>
        `${note.title} ${note.content} ${note.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [snapshot.notes, query],
  );

  function create() {
    setSelectedId("new");
    setTitle("");
    setContent("# New lab note\n\n");
    setTags("");
    setMode("edit");
  }
  function selectNote(note: (typeof snapshot.notes)[number]) {
    setSelectedId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags.join(", "));
    setMode("preview");
  }
  async function save() {
    if (!title.trim() || !content.trim()) return;
    const ok = await mutate(
      {
        action: "save-note",
        ...(selected ? { id: selected.id } : {}),
        data: {
          title,
          content,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          linkedDeviceIds: [],
          linkedServiceIds: [],
        },
      },
      selected ? "Lab note updated" : "Lab note created",
    );
    if (ok) setMode("preview");
  }
  async function remove() {
    if (!selected) return;
    if (!window.confirm(`Delete “${selected.title}”? This cannot be undone.`))
      return;
    const ok = await mutate(
      { action: "delete-note", id: selected.id },
      "Lab note deleted",
    );
    if (ok) {
      const next = snapshot.notes.find((note) => note.id !== selected.id);
      if (next) selectNote(next);
      else create();
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Local knowledge"
        title="Lab Notes"
        description="Fast Markdown runbooks, procedures, references, and troubleshooting records."
        actions={
          <Button onClick={create}>
            <FilePlus2 size={15} />
            New note
          </Button>
        }
      />
      <Card className="notes-workspace">
        <aside className="notes-sidebar">
          <div className="input-wrap">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes…"
              aria-label="Search lab notes"
            />
          </div>
          <div className="notes-list">
            {notes.map((note) => (
              <button
                key={note.id}
                className={note.id === selectedId ? "active" : ""}
                onClick={() => selectNote(note)}
              >
                <FileText size={15} />
                <span>
                  <strong>{note.title}</strong>
                  <small>
                    {formatRelativeTime(note.updatedAt)} ·{" "}
                    {note.tags.join(", ")}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className="note-editor">
          <header>
            <div>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Note title"
                aria-label="Note title"
                readOnly={mode === "preview" && Boolean(selected)}
              />
              <div className="note-tag-input">
                <Tag size={13} />
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="tags, comma-separated"
                  aria-label="Note tags"
                  readOnly={mode === "preview" && Boolean(selected)}
                />
              </div>
            </div>
            <div className="page-actions">
              <SegmentedControl
                label="Note editor mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "edit", label: "Edit" },
                  { value: "preview", label: "Preview" },
                ]}
              />
              {selected ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={remove}
                  aria-label="Delete note"
                >
                  <Trash2 size={15} />
                </Button>
              ) : null}
              <Button
                disabled={busy || !title.trim() || !content.trim()}
                onClick={save}
              >
                <Save size={14} />
                Save
              </Button>
            </div>
          </header>
          {mode === "edit" ? (
            <textarea
              className="markdown-input"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              aria-label="Markdown note content"
              placeholder="Write Markdown…"
            />
          ) : content ? (
            <article className="markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </article>
          ) : (
            <EmptyState
              icon={<Edit3 />}
              title="Create your first note"
              description="Start a lightweight runbook, address plan, or maintenance checklist."
              action={<Button onClick={create}>New note</Button>}
            />
          )}
        </section>
      </Card>
    </>
  );
}
