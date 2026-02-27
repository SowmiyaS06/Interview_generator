"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import { Button } from "./ui/button";

interface InterviewSearchFilterProps {
  interviews: Interview[];
  onFilteredChange: (filtered: Interview[]) => void;
}

export default function InterviewSearchFilter({
  interviews,
  onFilteredChange,
}: InterviewSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedTech, setSelectedTech] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique values for filters
  const { roles, types, technologies } = useMemo(() => {
    const rolesSet = new Set<string>();
    const typesSet = new Set<string>();
    const techSet = new Set<string>();

    interviews.forEach((interview) => {
      if (interview.role) rolesSet.add(interview.role);
      if (interview.type) typesSet.add(interview.type);
      if (interview.techstack) {
        interview.techstack.forEach((tech) => techSet.add(tech));
      }
    });

    return {
      roles: Array.from(rolesSet).sort(),
      types: Array.from(typesSet).sort(),
      technologies: Array.from(techSet).sort(),
    };
  }, [interviews]);

  // Apply filters
  const filteredInterviews = useMemo(() => {
    let filtered = [...interviews];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (interview) =>
          interview.role?.toLowerCase().includes(query) ||
          interview.type?.toLowerCase().includes(query) ||
          interview.techstack?.some((tech) => tech.toLowerCase().includes(query))
      );
    }

    // Role filter
    if (selectedRole !== "all") {
      filtered = filtered.filter((interview) => interview.role === selectedRole);
    }

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter((interview) => interview.type === selectedType);
    }

    // Technology filter
    if (selectedTech !== "all") {
      filtered = filtered.filter((interview) =>
        interview.techstack?.includes(selectedTech)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [
    interviews,
    searchQuery,
    selectedRole,
    selectedType,
    selectedTech,
    sortBy,
  ]);

  // Call parent callback when filters change
  useEffect(() => {
    onFilteredChange(filteredInterviews);
  }, [filteredInterviews, onFilteredChange]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedRole("all");
    setSelectedType("all");
    setSelectedTech("all");
    setSortBy("newest");
  };

  const hasActiveFilters =
    searchQuery ||
    selectedRole !== "all" ||
    selectedType !== "all" ||
    selectedTech !== "all" ||
    sortBy !== "newest";

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search Bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search by role, type, or technology..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search interviews"
            className="w-full pl-10 pr-4 py-2 bg-dark-200 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
          />
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-primary-100/10" : ""}
          aria-label="Toggle filters"
        >
          <Filter size={18} />
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilters}
            title="Clear filters"
            aria-label="Clear filters"
          >
            <X size={18} />
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-dark-200 rounded-lg border border-dark-300">
          {/* Role Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-primary-200">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 bg-dark-100 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="all">All Roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-primary-200">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-dark-100 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="all">All Types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Technology Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-primary-200">Technology</label>
            <select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="px-3 py-2 bg-dark-100 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="all">All Technologies</option>
              {technologies.map((tech) => (
                <option key={tech} value={tech}>
                  {tech}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-primary-200">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
              className="px-3 py-2 bg-dark-100 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          Showing {filteredInterviews.length} of {interviews.length} interview{interviews.length !== 1 ? "s" : ""}
        </span>
        {hasActiveFilters && (
          <span className="text-primary-200">Filters active</span>
        )}
      </div>
    </div>
  );
}
