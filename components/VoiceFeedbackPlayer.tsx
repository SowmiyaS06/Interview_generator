"use client";

import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const VoiceFeedbackPlayer = ({ feedbackText }: { feedbackText: string }) => {
  const hasFeedback = feedbackText.trim().length > 0;

  return (
    <Button
      type="button"
      variant="outline"
      disabled
      aria-label="Feedback audio disabled"
      title={hasFeedback ? "Automatic audio playback is disabled" : "No feedback text"}
    >
      <Volume2 size={18} className="mr-2" />
      Audio disabled
    </Button>
  );
};

export default VoiceFeedbackPlayer;
