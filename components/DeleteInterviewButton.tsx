"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { deleteInterview } from "@/lib/actions/general.action";

interface DeleteInterviewButtonProps {
  interviewId: string;
}

export default function DeleteInterviewButton({ interviewId }: DeleteInterviewButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const result = await deleteInterview(interviewId);
      
      if (result.success) {
        toast.success("Interview deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete interview");
      }
    } catch (error) {
      toast.error("An error occurred while deleting");
      console.error(error);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={handleDelete}
          disabled={isDeleting}
          variant="destructive"
          size="sm"
        >
          {isDeleting ? "Deleting..." : "Confirm"}
        </Button>
        <Button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          variant="outline"
          size="sm"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setShowConfirm(true)}
      variant="ghost"
      size="icon"
      className="hover:bg-destructive/20"
      title="Delete interview"
    >
      <Trash2 size={18} className="text-destructive" />
    </Button>
  );
}
