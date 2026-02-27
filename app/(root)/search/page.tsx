"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  searchInterviews,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
} from "@/lib/actions/search.action";

export default function SearchPage() {
  const [results, setResults] = useState<any[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [searchName, setSearchName] = useState("");

  // Filter states
  const [filters, setFilters] = useState({
    keyword: "",
    minScore: 0,
    maxScore: 100,
    startDate: "",
    endDate: "",
    roles: [] as string[],
    difficulties: [] as string[],
    types: [] as string[],
    tags: [] as string[],
  });

  const roles = [
    "Frontend Engineer",
    "Backend Engineer",
    "Full Stack Engineer",
    "DevOps Engineer",
    "Data Scientist",
    "Product Manager",
  ];

  const difficulties = ["Easy", "Medium", "Hard"];
  const types = ["Behavioral", "Technical", "Case Study", "System Design"];

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      setError(null);
      const result = await getSavedSearches();
      if (result.success) {
        setSavedSearches(result.searches || []);
      } else {
        setSavedSearches([]); // No saved searches yet - normal for new users
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load saved searches";
      console.error("Error loading saved searches:", err);
      // Don't show error for saved searches as it's secondary
    }
  };

  const loadSavedSearch = async (savedFilters: any) => {
    setFilters(savedFilters);
    // Trigger search with the loaded filters
    try {
      setLoading(true);
      setError(null);

      const result = await searchInterviews({
        keywords: savedFilters.keyword ? [savedFilters.keyword] : undefined,
        scoreRange: {
          min: savedFilters.minScore,
          max: savedFilters.maxScore,
        },
        dateRange: savedFilters.startDate || savedFilters.endDate ? {
          start: savedFilters.startDate || "",
          end: savedFilters.endDate || "",
        } : undefined,
        roles: savedFilters.roles.length > 0 ? savedFilters.roles : undefined,
        difficulties: savedFilters.difficulties.length > 0 ? savedFilters.difficulties : undefined,
        types: savedFilters.types.length > 0 ? savedFilters.types : undefined,
        tags: savedFilters.tags.length > 0 ? savedFilters.tags : undefined,
      });

      if (result.success) {
        setResults(result.interviews || []);
      } else {
        setResults([]);
        setError(result.error || "No results found. Try adjusting your filters.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to search interviews";
      setError(errorMessage);
      console.error("Error searching:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const result = await searchInterviews({
        keywords: filters.keyword ? [filters.keyword] : undefined,
        scoreRange: {
          min: filters.minScore,
          max: filters.maxScore,
        },
        dateRange: filters.startDate || filters.endDate ? {
          start: filters.startDate || "",
          end: filters.endDate || "",
        } : undefined,
        roles: filters.roles.length > 0 ? filters.roles : undefined,
        difficulties: filters.difficulties.length > 0 ? filters.difficulties : undefined,
        types: filters.types.length > 0 ? filters.types : undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
      });

      if (result.success) {
        setResults(result.interviews || []);
      } else {
        setResults([]);
        setError(result.error || "No results found. Try adjusting your filters.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to search interviews";
      setError(errorMessage);
      console.error("Error searching:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!searchName.trim()) return;

    try {
      const result = await saveSearch(searchName, filters);
      if (result.success) {
        setSearchName("");
        setShowSavePrompt(false);
        await loadSavedSearches();
      } else {
        setError("Failed to save search");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save search";
      setError(errorMessage);
      console.error("Error saving search:", err);
    }
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    try {
      const result = await deleteSavedSearch(searchId);
      if (result.success) {
        await loadSavedSearches();
      } else {
        setError("Failed to delete search");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete search";
      setError(errorMessage);
      console.error("Error deleting search:", err);
    }
  };

  const toggleMultiSelect = (
    array: string[],
    value: string
  ): string[] => {
    if (array.includes(value)) {
      return array.filter((v) => v !== value);
    }
    return [...array, value];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">Search Interviews</h1>
          <p className="text-lg text-slate-300 mt-3">Find interviews using advanced filters</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card p-4 mb-8 border-l-4 border-red-500">
            <div className="flex justify-between items-center">
              <p className="text-red-300">⚠️ {error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Saved Searches Sidebar */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold text-white mb-4">Saved Searches</h2>
            <div className="space-y-2">
              {savedSearches.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No saved searches yet</p>
              ) : (
                savedSearches.map((search) => (
                  <div key={search.id} className="flex items-center justify-between p-2 hover:bg-slate-800/40 rounded">
                    <button
                      onClick={() => loadSavedSearch(search.filters)}
                      className="flex-1 text-left text-sm text-amber-400 hover:text-amber-300"
                    >
                      {search.name}
                    </button>
                    <button
                      onClick={() => handleDeleteSavedSearch(search.id)}
                      className="text-red-400 hover:text-red-600 text-xs ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Search Form */}
          <div className="lg:col-span-2">
            <div className="glass-card p-8">
              <h2 className="text-xl font-bold text-white mb-6">Filters</h2>
              <form onSubmit={handleSearch} className="space-y-6">
                {/* Keyword */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Keyword Search
                  </label>
                  <input
                    type="text"
                    value={filters.keyword}
                    onChange={(e) =>
                      setFilters({ ...filters, keyword: e.target.value })
                    }
                    placeholder="Search interview transcripts..."
                    className="w-full px-4 py-2 bg-[#23272f] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Score Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Score Range
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={filters.minScore}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            minScore: parseInt(e.target.value),
                          })
                        }
                        placeholder="Min"
                        className="w-full px-4 py-2 bg-[#23272f] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={filters.maxScore}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            maxScore: parseInt(e.target.value),
                          })
                        }
                        placeholder="Max"
                        className="w-full px-4 py-2 bg-[#23272f] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="search-start-date" className="sr-only">Start Date</label>
                      <input
                        id="search-start-date"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            startDate: e.target.value,
                          })
                        }
                        placeholder="Start date"
                        aria-label="Start date"
                        className="w-full px-4 py-2 bg-[#23272f] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                    <div>
                      <label htmlFor="search-end-date" className="sr-only">End Date</label>
                      <input
                        id="search-end-date"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            endDate: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-[#23272f] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Job Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() =>
                          setFilters({
                            ...filters,
                            roles: toggleMultiSelect(filters.roles, role),
                          })
                        }
                        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                          filters.roles.includes(role)
                            ? "bg-amber-600 text-white shadow"
                            : "bg-[#23272f] text-amber-200 hover:bg-amber-800/60"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulties */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Difficulty
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {difficulties.map((difficulty) => (
                      <button
                        key={difficulty}
                        type="button"
                        onClick={() =>
                          setFilters({
                            ...filters,
                            difficulties: toggleMultiSelect(
                              filters.difficulties,
                              difficulty
                            ),
                          })
                        }
                        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                          filters.difficulties.includes(difficulty)
                            ? "bg-emerald-600 text-white shadow"
                            : "bg-[#23272f] text-emerald-200 hover:bg-emerald-800/60"
                        }`}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interview Types */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Interview Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {types.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setFilters({
                            ...filters,
                            types: toggleMultiSelect(filters.types, type),
                          })
                        }
                        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                          filters.types.includes(type)
                            ? "bg-slate-600 text-white shadow"
                            : "bg-[#23272f] text-slate-300 hover:bg-slate-700/60"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 glass-card bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    {loading ? "Searching..." : "Search"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowSavePrompt(true)}
                    className="flex-1 glass-card bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    Save Search
                  </Button>
                </div>
              </form>

              {/* Save Search Prompt */}
              {showSavePrompt && (
                <div className="mt-4 p-4 glass-card border">
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Save this search as..."
                    className="w-full px-4 py-2 bg-[#23272f] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 mb-2"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveSearch}
                      className="flex-1 glass-card bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setShowSavePrompt(false)}
                      className="flex-1 glass-card bg-slate-600 hover:bg-slate-700 text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-8 glass-card p-8">
                <h2 className="text-xl font-bold text-white mb-4">Results ({results.length})</h2>
                <div className="space-y-4">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="p-4 border border-slate-800 rounded hover:bg-slate-800/40 cursor-pointer transition glass-card bg-[#23272f]"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">Interview {result.position || ""}</h3>
                          <p className="text-sm text-slate-300 mt-1">{result.role} • {result.difficulty}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-amber-400">{result.score || 0}</p>
                          <p className="text-xs text-slate-400">{new Date(result.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
