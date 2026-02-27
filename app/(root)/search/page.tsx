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
    <div className="min-h-screen bg-gradient-to-br from-[#0f1117] via-[#181c24] to-[#23272f] p-8">
      <div className="max-w-8xl mx-auto">
        {/* Header Section */}
        <div className="mb-12 animate-fade-in">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600/10 to-emerald-600/10 border border-amber-600/20 p-8">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl -z-10"></div>
            <h1 className="text-6xl font-bold text-white tracking-tight mb-2">Discover Interviews</h1>
            <p className="text-xl text-slate-300">Search through your interview history with powerful filters</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-5 glass-card border-l-4 border-red-500 bg-red-600/10 rounded-lg animate-slide-down">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-red-300 font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-sm bg-red-700 hover:bg-red-800 text-white px-4 py-1.5 rounded-lg transition-all duration-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Filters & Saved Searches */}
          <div className="lg:col-span-1 space-y-6">
            {/* Filters Card */}
            <div className="glass-card p-7 sticky top-8 max-h-[calc(100vh-120px)] overflow-y-auto bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-700">
                <span className="text-2xl">⚙️</span>
                <h2 className="text-xl font-bold text-white">Search Filters</h2>
              </div>

              <form onSubmit={handleSearch} className="space-y-5">
                {/* Keyword */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-100 mb-2 ml-1">🔍 Keyword</label>
                  <input
                    type="text"
                    value={filters.keyword}
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    placeholder="Type keywords..."
                    className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent transition-all placeholder:text-slate-500"
                  />
                </div>

                {/* Score Range */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-100 mb-3 ml-1">📊 Performance Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={filters.minScore}
                        onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                        placeholder="Min"
                        className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={filters.maxScore}
                        onChange={(e) => setFilters({ ...filters, maxScore: parseInt(e.target.value) })}
                        placeholder="Max"
                        className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Date Range */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-100 mb-3 ml-1">📅 Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="px-3 py-2.5 bg-slate-800/60 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="px-3 py-2.5 bg-slate-800/60 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Role */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-100 mb-3 ml-1">💼 Job Role</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {roles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFilters({ ...filters, roles: toggleMultiSelect(filters.roles, role) })}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                          filters.roles.includes(role)
                            ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/30"
                            : "bg-slate-800/40 text-slate-300 hover:bg-slate-800/60 border-slate-600 hover:border-slate-500"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-100 mb-3 ml-1">⚡ Difficulty</label>
                  <div className="flex gap-2">
                    {difficulties.map((difficulty) => (
                      <button
                        key={difficulty}
                        type="button"
                        onClick={() => setFilters({ ...filters, difficulties: toggleMultiSelect(filters.difficulties, difficulty) })}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 border ${
                          filters.difficulties.includes(difficulty)
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30"
                            : "bg-slate-800/40 text-slate-300 hover:bg-slate-800/60 border-slate-600"
                        }`}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-100 mb-3 ml-1">📝 Interview Type</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {types.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFilters({ ...filters, types: toggleMultiSelect(filters.types, type) })}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                          filters.types.includes(type)
                            ? "bg-slate-600 text-white border-slate-500 shadow-lg shadow-slate-600/30"
                            : "bg-slate-800/40 text-slate-300 hover:bg-slate-800/60 border-slate-600"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-2 border-t border-slate-700">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full glass-card bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-amber-600/30 disabled:opacity-50"
                  >
                    {loading ? "🔄 Searching..." : "🔍 Search Interviews"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowSavePrompt(true)}
                    className="w-full glass-card bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-emerald-600/30"
                  >
                    💾 Save This Search
                  </Button>
                </div>

                {/* Save Prompt */}
                {showSavePrompt && (
                  <div className="mt-4 p-4 glass-card border border-emerald-600/30 bg-emerald-600/5 rounded-lg animate-slide-down">
                    <input
                      type="text"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="Name this search..."
                      className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-3 placeholder:text-slate-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={handleSaveSearch}
                        className="glass-card bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg transition-all"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => setShowSavePrompt(false)}
                        className="glass-card bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 rounded-lg transition-all"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Saved Searches Card */}
            <div className="glass-card p-6 bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-2xl shadow-lg">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
                <span className="text-2xl">⭐</span>
                <h2 className="text-lg font-bold text-white">Saved Searches</h2>
                <span className="ml-auto text-xs font-semibold text-amber-400 bg-amber-600/20 px-3 py-1 rounded-full">{savedSearches.length}</span>
              </div>
              <div className="space-y-2">
                {savedSearches.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-2">📂</p>
                    <p className="text-sm text-slate-500">Save a search to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {savedSearches.map((search) => (
                      <div key={search.id} className="flex items-center justify-between p-3 hover:bg-slate-700/40 rounded-lg group transition-all border border-transparent hover:border-slate-600">
                        <button
                          onClick={() => loadSavedSearch(search.filters)}
                          className="flex-1 text-left text-sm text-amber-400 hover:text-amber-300 font-semibold transition group-hover:translate-x-1"
                        >
                          {search.name}
                        </button>
                        <button
                          onClick={() => handleDeleteSavedSearch(search.id)}
                          className="text-red-400 hover:text-red-600 text-xs ml-2 opacity-0 group-hover:opacity-100 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Results Section */}
            {results.length > 0 ? (
              <div className="glass-card p-8 border border-amber-600/30 bg-gradient-to-br from-slate-900/60 to-slate-950/60 rounded-2xl shadow-2xl animate-fade-in">
                <div className="mb-8 pb-6 border-b border-slate-700">
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    🎯 Results <span className="text-2xl text-amber-400 font-bold">({results.length})</span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-2">Interviews matching your criteria</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="group p-6 border border-slate-700 rounded-xl hover:border-amber-600/50 hover:bg-slate-800/40 cursor-pointer transition-all duration-300 glass-card bg-gradient-to-r from-[#1f2329] to-[#23272f] hover:shadow-xl hover:shadow-amber-600/10"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-lg group-hover:text-amber-400 transition">{result.position || "Interview"}</h3>
                          <p className="text-sm text-slate-400 mt-1">{result.role} • {result.difficulty}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-amber-400">{result.score || "—"}</div>
                          <p className="text-xs text-slate-500 mt-1">Score</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap mb-4">
                        <span className="text-xs px-3 py-1.5 bg-emerald-600/20 text-emerald-300 rounded-full font-semibold border border-emerald-600/30">
                          {result.type}
                        </span>
                        {result.companyName && (
                          <span className="text-xs px-3 py-1.5 bg-amber-600/20 text-amber-300 rounded-full font-semibold border border-amber-600/30">
                            {result.companyName}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500">📅 {result.createdAt ? new Date(result.createdAt).toLocaleDateString() : "N/A"}</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            (result.score || 0) >= 80 ? 'bg-emerald-500' : (result.score || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-xs text-slate-400">{(result.score || 0) >= 80 ? 'Excellent' : (result.score || 0) >= 60 ? 'Good' : 'Needs Work'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !loading && (
                <div className="glass-card p-12 text-center border border-dashed border-slate-600 bg-gradient-to-br from-slate-800/10 to-slate-900/10 rounded-2xl min-h-96 flex flex-col items-center justify-center">
                  <div className="mb-6">
                    <p className="text-6xl mb-4">🔍</p>
                    <p className="text-white font-bold text-2xl">No results found</p>
                    <p className="text-slate-400 mt-3 max-w-md">Try adjusting your filters or clearing them to find interviews</p>
                  </div>
                  {(filters.keyword || filters.roles.length > 0 || filters.difficulties.length > 0 || filters.types.length > 0) && (
                    <Button
                      type="button"
                      onClick={() => {
                        setFilters({
                          keyword: "",
                          minScore: 0,
                          maxScore: 100,
                          startDate: "",
                          endDate: "",
                          roles: [],
                          difficulties: [],
                          types: [],
                          tags: [],
                        });
                        setResults([]);
                        setError(null);
                      }}
                      className="mt-6 bg-slate-600 hover:bg-slate-700 text-white px-8 py-3 font-semibold rounded-lg transition-all"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              )
            )}

            {/* Empty State - When no search has been done */}
            {results.length === 0 && loading === false && !error && !(filters.keyword || filters.roles.length > 0 || filters.difficulties.length > 0 || filters.types.length > 0) && (
              <div className="glass-card p-12 text-center border border-dashed border-slate-600 bg-gradient-to-br from-amber-600/10 via-emerald-600/10 to-slate-900/20 rounded-2xl min-h-96 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-emerald-600 rounded-full blur-2xl opacity-20"></div>
                  <p className="text-6xl mb-6 relative">✨</p>
                </div>
                <p className="text-white font-bold text-2xl mb-2">Ready to Search</p>
                <p className="text-slate-300 max-w-md">Select your filters on the left and click "Search Interviews" to get started</p>
                <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
                  <span>👈</span>
                  <span>Use filters to narrow down your results</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
