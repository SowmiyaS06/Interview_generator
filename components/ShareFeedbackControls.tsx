"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const ShareFeedbackControls = ({ interviewId, shareId }: { interviewId: string; shareId?: string | null }) => {
  const [currentShareId, setCurrentShareId] = useState<string | null>(shareId ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const shareUrl = currentShareId ? `${baseUrl}/share/${currentShareId}` : "";

  const enableShare = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId }),
      });
      const result = (await response.json()) as { success: boolean; shareId?: string; error?: string };
      if (!result.success || !result.shareId) {
        toast.error(result.error || "Failed to enable sharing");
        return;
      }

      setCurrentShareId(result.shareId);
      toast.success("Share link created");
    } catch {
      toast.error("Failed to enable sharing");
    } finally {
      setIsLoading(false);
    }
  };

  const disableShare = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        toast.error(result.error || "Failed to disable sharing");
        return;
      }

      setCurrentShareId(null);
      toast.success("Share link removed");
    } catch {
      toast.error("Failed to disable sharing");
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = async () => {
    if (!currentShareId) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied");
  };

  return (
    <div className="flex flex-wrap gap-3">
      {currentShareId ? (
        <>
          <Button type="button" variant="outline" onClick={copyLink}>
            Copy share link
          </Button>
          <Button type="button" variant="destructive" onClick={disableShare} disabled={isLoading}>
            Disable sharing
          </Button>
        </>
      ) : (
        <Button type="button" onClick={enableShare} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create share link"}
        </Button>
      )}
    </div>
  );
};

export default ShareFeedbackControls;
