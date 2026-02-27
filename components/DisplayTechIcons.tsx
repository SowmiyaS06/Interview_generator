"use client";

import Image from "next/image";
import { useState } from "react";

import { cn, getTechLogos } from "@/lib/utils";

const DisplayTechIcons = ({ techStack }: TechIconProps) => {
  const techIcons = getTechLogos(techStack);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (tech: string) => {
    setImageErrors((prev) => new Set(prev).add(tech));
  };

  return (
    <div className="flex flex-row">
      {techIcons.slice(0, 3).map(({ tech, url }, index) => (
        <div
          key={tech}
          className={cn(
            "relative group bg-dark-300 rounded-full p-2 flex flex-center",
            index >= 1 && "-ml-3"
          )}
        >
          <span className="tech-tooltip">{tech}</span>

          <Image
            src={imageErrors.has(tech) ? "/tech.svg" : url}
            alt={tech}
            width={100}
            height={100}
            className="size-5"
            onError={() => handleImageError(tech)}
          />
        </div>
      ))}
    </div>
  );
};

export default DisplayTechIcons;
