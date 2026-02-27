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
    const result = await getSavedSearches();
    if (result.success) {
      setSavedSearches(result.searches || []);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
    }
    setLoading(false);
  };

  const handleSaveSearch = async () => {
    if (!searchName.trim()) return;

    const result = await saveSearch(searchName, filters);
    if (result.success) {
      setSearchName("");
      setShowSavePrompt(false);
      loadSavedSearches();
    }
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    const result = await deleteSavedSearch(searchId);
    if (result.success) {
      loadSavedSearches();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Search Interviews
          </h1>
          <p className="text-slate-600 mt-2">
            Find interviews using advanced filters
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saved Searches Sidebar */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Saved Searches
            </h2>
            <div className="space-y-2">
              {savedSearches.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-4">
                  No saved searches yet
                </p>
              ) : (
                savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-2 hover:bg-slate-50 rounded"
                  >
                    <button
                      onClick={() => {
                        setFilters(search.filters);
                        handleSearch(
                          new Event("submit") as any
                        );
                      }}
                      className="flex-1 text-left text-sm text-blue-600 hover:text-blue-800"
                    >
                      {search.name}
                    </button>
                    <button
                      onClick={() => handleDeleteSavedSearch(search.id)}
                      className="text-red-600 hover:text-red-800 text-xs ml-2"
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Filters</h2>
              <form onSubmit={handleSearch} className="space-y-6">
                {/* Keyword */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Keyword Search
                  </label>
                  <input
                    type="text"
                    value={filters.keyword}
                    onChange={(e) =>
                      setFilters({ ...filters, keyword: e.target.value })
                    }
                    placeholder="Search interview transcripts..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Score Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulties */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                            ? "bg-green-600 text-white"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interview Types */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                            ? "bg-purple-600 text-white"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
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
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? "Searching..." : "Search"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowSavePrompt(true)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Save Search
                  </Button>
                </div>
              </form>

              {/* Save Search Prompt */}
              {showSavePrompt && (
                <div className="mt-4 p-4 bg-slate-50 rounded border">
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Save this search as..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveSearch}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setShowSavePrompt(false)}
                      className="flex-1 bg-slate-400 hover:bg-slate-500"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  Results ({results.length})
                </h2>
                <div className="space-y-4">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="p-4 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">
                            Interview {result.position || ""}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {result.role} • {result.difficulty}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900">
                            {result.score || 0}
                          </p>
                          <p className="text-xs text-slate-600">
                            {new Date(result.createdAt).toLocaleDateString()}
                          </p>
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
