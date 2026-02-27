import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated, isAdmin } from "@/lib/actions/auth.action";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LogoutButton from "@/components/LogoutButton";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  const userIsAdmin = await isAdmin();

  return (
    <div className="root-layout">
      <nav className="flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="PrepWise Logo" width={38} height={32} />
          <h2 className="text-primary-100">PrepWise</h2>
        </Link>

        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/history" className="text-sm text-light-100 hover:text-primary-100">
            History
          </Link>
          <Link href="/goals" className="text-sm text-light-100 hover:text-primary-100">
            Goals
          </Link>
          <Link href="/performance" className="text-sm text-light-100 hover:text-primary-100">
            Performance
          </Link>
          <Link href="/company-interviews" className="text-sm text-light-100 hover:text-primary-100">
            Companies
          </Link>
          <Link href="/search" className="text-sm text-light-100 hover:text-primary-100">
            Search
          </Link>
          <Link href="/achievements" className="text-sm text-light-100 hover:text-primary-100">
            Achievements
          </Link>
          <Link href="/leaderboard" className="text-sm text-light-100 hover:text-primary-100">
            Leaderboard
          </Link>
          <Link href="/profile" className="text-sm text-light-100 hover:text-primary-100">
            Profile
          </Link>
          {userIsAdmin && (
            <Link href="/admin" className="text-sm text-primary-100 hover:text-primary-200 font-semibold">
              Admin
            </Link>
          )}
          <LogoutButton />
        </div>
      </nav>

      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
};

export default Layout;
