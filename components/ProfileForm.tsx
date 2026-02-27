"use client";

import { useState } from "react";
import { toast } from "sonner";
import { sendPasswordResetEmail } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/firebase/client";

const ProfileForm = ({ user }: { user: User }) => {
  const [name, setName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const result = (await response.json()) as { success: boolean; message?: string };
      if (!result.success) {
        toast.error(result.message || "Failed to update profile");
        return;
      }

      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!auth) {
      toast.error("Auth is not configured");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success("Password reset email sent");
    } catch {
      toast.error("Failed to send reset email");
    }
  };

  const handleResumeUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // First, upload the file to the server
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/profile/upload-resume", {
        method: "POST",
        body: formData,
      });

      const uploadResult = (await uploadResponse.json()) as {
        success: boolean;
        resumeUrl?: string;
        error?: string;
      };

      if (!uploadResult.success) {
        toast.error(uploadResult.error || "Failed to upload resume");
        return;
      }

      // Then, save the URL to the user profile
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeUrl: uploadResult.resumeUrl }),
      });

      const result = (await response.json()) as { success: boolean; message?: string };
      if (!result.success) {
        toast.error(result.message || "Failed to save resume");
        return;
      }

      toast.success("Resume uploaded");
    } catch {
      toast.error("Failed to upload resume");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card-border w-full">
      <div className="card p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-light-100">Full name</label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="bg-dark-200 border-dark-300"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-light-100">Email</label>
          <Input value={user.email} disabled className="bg-dark-200 border-dark-300" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-light-100">Resume (PDF or DOCX)</label>
          <Input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleResumeUpload(file);
            }}
            className="bg-dark-200 border-dark-300"
          />
          {user.resumeUrl && (
            <a
              href={user.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary-200"
            >
              View current resume
            </a>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
          <Button variant="outline" onClick={handlePasswordReset}>
            Send password reset email
          </Button>
        </div>

        {isUploading && <p className="text-sm text-light-100">Uploading resume...</p>}
      </div>
    </div>
  );
};

export default ProfileForm;
