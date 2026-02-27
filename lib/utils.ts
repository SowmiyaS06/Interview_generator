import { interviewCovers, mappings } from "@/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const techIconBaseURL = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

const normalizeTechName = (tech: string) => {
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  return mappings[key as keyof typeof mappings];
};

export const getTechLogos = (techArray: string[]) => {
  return techArray.map((tech) => {
    const normalized = normalizeTechName(tech);
    return {
      tech,
      url: `${techIconBaseURL}/${normalized}/${normalized}-original.svg`,
    };
  });
};

export const getRandomInterviewCover = () => {
  const randomIndex = Math.floor(Math.random() * interviewCovers.length);
  return `/covers${interviewCovers[randomIndex]}`;
};

// Generate user avatar with initials and colored background
export const getUserAvatar = (userName: string, userId: string = "guest") => {
  // Extract initials from name
  const nameParts = userName.trim().split(/\s+/);
  const initials = nameParts.length > 1 
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : userName.substring(0, 2).toUpperCase();

  // Generate consistent color based on userId
  const colors = [
    "3B82F6", // blue
    "EF4444", // red
    "10B981", // green
    "F59E0B", // amber
    "8B5CF6", // violet
    "EC4899", // pink
    "06B6D4", // cyan
    "F97316", // orange
    "6366F1", // indigo
    "14B8A6", // teal
  ];

  const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % colors.length;
  const backgroundColor = colors[colorIndex];

  // Use ui-avatars.com for clean, professional initials
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor}&color=fff&size=256&bold=true&format=svg`;
};
