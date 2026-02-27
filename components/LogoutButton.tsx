"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth.action";
import { toast } from "sonner";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.push("/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      size="sm"
      className="text-sm text-light-100 hover:text-primary-100"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  );
}
