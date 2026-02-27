"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getFlashcards, reviewFlashcard, createFlashcard } from "@/lib/actions/features.action";

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [dueOnly, setDueOnly] = useState(true);
  const [formData, setFormData] = useState({
    front: "",
    back: "",
    category: "interview_prep",
  });

  useEffect(() => {
    fetchFlashcards();
  }, [dueOnly]);

  async function fetchFlashcards() {
    setLoading(true);
    const result = await getFlashcards(undefined, dueOnly);
    if (result.success && result.cards) {
      setFlashcards(result.cards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    }
    setLoading(false);
  }

  async function handleReview(correct: boolean) {
    if (flashcards.length === 0) return;
    const card = flashcards[currentCardIndex];
    await reviewFlashcard(card.id, correct);

    // Move to next card
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    } else {
      await fetchFlashcards();
    }
  }

  async function handleCreateCard() {
    if (!formData.front || !formData.back) return;
    const result = await createFlashcard(
      formData.front,
      formData.back,
      formData.category,
      "user_created"
    );
    if (result.success) {
      setFormData({ front: "", back: "", category: "interview_prep" });
      setShowCreateForm(false);
      await fetchFlashcards();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-[#181c24] to-[#23272f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const currentCard = flashcards[currentCardIndex];

  return (
    <div className="min-h-screen bg-linear-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Flashcards</h1>
            <p className="text-slate-300 mt-2">Practice with spaced repetition</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {showCreateForm ? "Cancel" : "+ New Card"}
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="glass-card p-6 mb-8">
            <input
              type="text"
              placeholder="Question/Front"
              value={formData.front}
              onChange={(e) => setFormData({ ...formData, front: e.target.value })}
              className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white mb-4"
            />
            <textarea
              placeholder="Answer/Back"
              value={formData.back}
              onChange={(e) => setFormData({ ...formData, back: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white mb-4"
            />
            <Button onClick={handleCreateCard} className="bg-green-600 w-full">
              Create Card
            </Button>
          </div>
        )}

        {/* Filter */}
        <div className="glass-card p-4 mb-8 flex justify-between items-center">
          <span className="text-white">
            Card {currentCardIndex + 1} of {flashcards.length}
          </span>
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={dueOnly}
              onChange={(e) => setDueOnly(e.target.checked)}
              className="w-4 h-4"
            />
            Due cards only
          </label>
        </div>

        {/* Card Display */}
        {flashcards.length > 0 && currentCard ? (
          <div>
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="glass-card p-12 mb-8 cursor-pointer min-h-[300px] flex items-center justify-center"
            >
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-4">{isFlipped ? "ANSWER" : "QUESTION"}</p>
                <p className="text-2xl font-bold text-white">
                  {isFlipped ? currentCard.back : currentCard.front}
                </p>
                <p className="text-slate-400 mt-4">Click to flip</p>
              </div>
            </div>

            {isFlipped && (
              <div className="flex gap-4">
                <Button
                  onClick={() => handleReview(false)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  ❌ Incorrect
                </Button>
                <Button
                  onClick={() => handleReview(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  ✅ Correct
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <p className="text-xl text-slate-300">No cards to review!</p>
            <p className="text-slate-400 mt-2">Create a new card or uncheck "Due cards only"</p>
          </div>
        )}
      </div>
    </div>
  );
}
