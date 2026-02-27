"use client";

import { useEffect, useMemo, useState } from "react";
import { Volume2, PauseCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

const VoiceFeedbackPlayer = ({ feedbackText }: { feedbackText: string }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const utterance = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new SpeechSynthesisUtterance(feedbackText);
  }, [feedbackText]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = () => {
    if (!utterance || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStop = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={isSpeaking ? handleStop : handlePlay}
      aria-label="Play feedback audio"
    >
      {isSpeaking ? (
        <>
          <PauseCircle size={18} className="mr-2" />
          Stop audio
        </>
      ) : (
        <>
          <Volume2 size={18} className="mr-2" />
          Play feedback
        </>
      )}
    </Button>
  );
};

export default VoiceFeedbackPlayer;
