"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function SidebarNav() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState<number | null>(null);

  const navItems = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    {
      label: "Learning",
      icon: "📚",
      submenu: [
        { href: "/flashcards", label: "Flashcards", icon: "📇" },
        { href: "/dsa-problems", label: "DSA Problems", icon: "💻" },
        { href: "/study-plans", label: "Study Plans", icon: "📋" },
      ],
    },
    {
      label: "Community",
      icon: "👥",
      submenu: [
        { href: "/forum", label: "Forum", icon: "💬" },
        { href: "/challenges", label: "Challenges", icon: "🏆" },
        { href: "/companies", label: "Company Database", icon: "🏢" },
      ],
    },
    {
      label: "Interview Prep",
      icon: "🎤",
      submenu: [
        { href: "/interview", label: "Practice Interview", icon: "🎙️" },
        { href: "/goals", label: "Goals", icon: "🎯" },
        { href: "/history", label: "History", icon: "📊" },
      ],
    },
    { href: "/leaderboard", label: "Leaderboard", icon: "👑" },
    { href: "/profile", label: "Profile", icon: "👤" },
  ];

  return (
    <div className="hidden md:flex w-64 bg-[#23272f] border-r border-slate-700 flex-col p-4">
      <h1 className="text-2xl font-bold text-white mb-8">PrepWise</h1>

      <nav className="space-y-2 flex-1">
        {navItems.map((item, idx) => (
          <div key={idx}>
            {item.href ? (
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  pathname === item.href
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ) : (
              <>
                <button
                  onClick={() =>
                    setIsExpanded((prev) => (prev === idx ? -1 : idx))
                  }
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 transition"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="ml-auto">
                    {isExpanded === idx ? "▼" : "▶"}
                  </span>
                </button>

                {isExpanded === idx && item.submenu && (
                  <div className="ml-4 space-y-1 mt-1">
                    {item.submenu.map((subitem, sidx) => (
                      <Link
                        key={sidx}
                        href={subitem.href}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
                          pathname === subitem.href
                            ? "bg-blue-600 text-white"
                            : "text-slate-400 hover:bg-slate-700/50"
                        }`}
                      >
                        <span>{subitem.icon}</span>
                        <span>{subitem.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
