"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  addInterviewNote,
  getInterviewNotes,
  deleteNote,
  addBookmark,
  getInterviewBookmarks,
  removeBookmark,
  addTag,
  getInterviewTags,
} from "@/lib/actions/notes.action";

interface InterviewNotesSidebarProps {
  interviewId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InterviewNotesSidebar({
  interviewId,
  isOpen,
  onClose,
}: InterviewNotesSidebarProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "bookmarks" | "tags">(
    "notes"
  );
  const [notes, setNotes] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [newNote, setNewNote] = useState({ text: "", type: "general" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, interviewId]);

  const loadData = async () => {
    setLoading(true);
    const [notesResult, bookmarksResult, tagsResult] = await Promise.all([
      getInterviewNotes(interviewId),
      getInterviewBookmarks(interviewId),
      getInterviewTags(interviewId),
    ]);

    if (notesResult.success) setNotes(notesResult.notes || []);
    if (bookmarksResult.success) setBookmarks(bookmarksResult.bookmarks || []);
    if (tagsResult.success) setTags(tagsResult.tags || []);
    setLoading(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addInterviewNote(
      interviewId,
      newNote.text,
      newNote.type as any
    );
    if (result.success) {
      setNewNote({ text: "", type: "general" });
      loadData();
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const result = await deleteNote(noteId);
    if (result.success) {
      loadData();
    }
  };

  const getNoteColor = (type: string) => {
    switch (type) {
      case "strength":
        return "bg-green-100 border-green-300";
      case "improvement":
        return "bg-red-100 border-red-300";
      case "question":
        return "bg-blue-100 border-blue-300";
      default:
        return "bg-yellow-100 border-yellow-300";
    }
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case "strength":
        return "✓";
      case "improvement":
        return "✕";
      case "question":
        return "?";
      default:
        return "•";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      ></div>

      {/* Sidebar */}
      <div className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Interview Notes</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {["notes", "bookmarks", "tags"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Notes Tab */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={newNote.text}
                  onChange={(e) =>
                    setNewNote({ ...newNote, text: e.target.value })
                  }
                  placeholder="Add a note..."
                  rows={3}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <select
                    value={newNote.type}
                    onChange={(e) =>
                      setNewNote({ ...newNote, type: e.target.value })
                    }
                    className="flex-1 p-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="strength">Strength</option>
                    <option value="improvement">Improvement</option>
                    <option value="question">Question</option>
                  </select>
                  <Button type="submit" size="sm" className="bg-blue-600">
                    Add
                  </Button>
                </div>
              </form>

              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded border ${getNoteColor(note.type)}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {getNoteIcon(note.type)} {note.text}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No notes yet
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bookmarks Tab */}
          {activeTab === "bookmarks" && (
            <div className="space-y-2">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="p-3 bg-slate-50 rounded border">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {bookmark.questionText}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            bookmark.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : bookmark.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {bookmark.priority}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBookmark(bookmark.id)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      ★
                    </button>
                  </div>
                </div>
              ))}
              {bookmarks.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No bookmarks yet
                </p>
              )}
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === "tags" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{
                      backgroundColor: tag.color || "#3b82f6",
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              {tags.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No tags yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
