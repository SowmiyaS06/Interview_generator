"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  createCompanyProfile,
  getCompanyProfile,
  recordCompanyInterview,
  getUserCompanyInterviews,
  deleteCompanyProfile,
} from "@/lib/actions/company.action";

export default function CompanyInterviewsPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showAddInterview, setShowAddInterview] = useState(false);

  const [newCompany, setNewCompany] = useState({
    name: "",
    industry: "",
    size: "medium",
    website: "",
  });

  const [newInterview, setNewInterview] = useState({
    position: "",
    stage: "phone_screen",
    status: "scheduled",
    feedback: "",
  });

  useEffect(() => {
    fetchCompanyInterviews();
  }, []);

  const fetchCompanyInterviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getUserCompanyInterviews();
      console.log("Companies fetched:", result); // Debug log
      if (result.success) {
        setCompanies(result.interviews || []);
      } else {
        setCompanies([]);
        if (result.error && result.error !== "Unauthorized") {
          setError(result.error);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load your company interviews";
      setError(errorMessage);
      console.error("Error loading company interviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const result = await createCompanyProfile(
        newCompany.name,
        newCompany.industry,
        newCompany.size,
        newCompany.website
      );

      if (result.success) {
        setNewCompany({
          name: "",
          industry: "",
          size: "medium",
          website: "",
        });
        setShowCreateCompany(false);
        await fetchCompanyInterviews();
      } else {
        setError(result.error || "Failed to create company profile");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create company profile";
      setError(errorMessage);
      console.error("Error creating company:", err);
    }
  };
  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (deleteConfirm !== companyId) {
      setDeleteConfirm(companyId);
      return;
    }

    try {
      setError(null);
      const result = await deleteCompanyProfile(companyId);
      
      if (result.success) {
        await fetchCompanyInterviews();
        setDeleteConfirm(null);
      } else {
        setError(result.error || "Failed to delete company");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete company";
      setError(errorMessage);
      console.error("Error deleting company:", err);
    }
  };
  const handleAddInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    try {
      setError(null);
      const result = await recordCompanyInterview(
        selectedCompany,
        newInterview.position,
        newInterview.stage,
        newInterview.status,
        newInterview.feedback
      );

      if (result.success) {
        setNewInterview({
          position: "",
          stage: "phone_screen",
          status: "scheduled",
          feedback: "",
        });
        setShowAddInterview(false);
        await fetchCompanyInterviews();
      } else {
        setError(result.error || "Failed to record interview");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to record interview";
      setError(errorMessage);
      console.error("Error recording interview:", err);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "phone_screen":
        return "bg-blue-100 text-blue-800";
      case "technical":
        return "bg-purple-100 text-purple-800";
      case "onsite":
        return "bg-orange-100 text-orange-800";
      case "offer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "in_progress":
        return "text-blue-600";
      case "scheduled":
        return "text-yellow-600";
      case "rejected":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          <p className="text-slate-300 mt-4">Loading your company interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">Company Interviews</h1>
            <p className="text-lg text-slate-300 mt-3">Track your interviews with different companies</p>
          </div>
          <button
            onClick={() => setShowCreateCompany(!showCreateCompany)}
            className="glass-card px-6 py-2 text-base font-semibold text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-lg rounded-lg transition-all border border-amber-500/30"
          >
            {showCreateCompany ? "Cancel" : "+ New Company"}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card p-4 mb-8 border-l-4 border-red-500">
            <div className="flex justify-between items-center">
              <p className="text-red-300">⚠️ {error}</p>
              <button
                onClick={() => {
                  setError(null);
                  fetchCompanyInterviews();
                }}
                className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Create Company Form */}
        {showCreateCompany && (
          <div className="glass-card p-8 mb-10">
            <h2 className="text-2xl font-bold text-white mb-4">Add Company</h2>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    placeholder="e.g., Google, Meta, Amazon"
                    className="w-full px-4 py-2 bg-[#23272f] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Industry</label>
                  <input
                    type="text"
                    value={newCompany.industry}
                    onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
                    placeholder="e.g., Technology, Finance"
                    className="w-full px-4 py-2 bg-[#23272f] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-size" className="block text-sm font-medium text-slate-200 mb-2">Company Size</label>
                  <select
                    id="company-size"
                    value={newCompany.size}
                    onChange={(e) => setNewCompany({ ...newCompany, size: e.target.value })}
                    className="w-full px-4 py-2 bg-[#23272f] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="startup">Startup (1-50)</option>
                    <option value="small">Small (50-500)</option>
                    <option value="medium">Medium (500-5000)</option>
                    <option value="large">Large (5000+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Website (optional)</label>
                  <input
                    type="url"
                    value={newCompany.website}
                    onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                    placeholder="https://company.com"
                    className="w-full px-4 py-2 bg-[#23272f] border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full glass-card bg-green-700/80 hover:bg-green-800/90 text-white font-semibold text-lg shadow-lg">Add Company</Button>
            </form>
          </div>
        )}

        {/* Companies List */}
        {companies.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <h3 className="text-xl font-semibold text-slate-200 mb-2">No companies added yet</h3>
            <p className="text-slate-400">Add your first company to start tracking interviews</p>
          </div>
        ) : (
          <div className="space-y-6">
            {companies.map((company) => (
              <div key={company.id} className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 shadow-xl">
                {/* Company Header */}
                <div className="bg-gradient-to-r from-slate-700/90 via-slate-800/90 to-slate-900/90 p-6 text-white border-b border-amber-500/30">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold drop-shadow-lg mb-2">{company.companyName || "Unknown Company"}</h2>
                      <div className="flex flex-wrap gap-3 items-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {company.interviews?.length || 0} {company.interviews?.length === 1 ? 'Interview' : 'Interviews'}
                        </span>
                        {company.industry && (
                          <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
                            {company.industry}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {deleteConfirm === company.id ? (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleDeleteCompany(company.id, company.companyName)}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg"
                          >
                            ✓ Confirm Delete
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => setDeleteConfirm(null)}
                            className="bg-white/95 hover:bg-white text-slate-800 font-semibold shadow-lg"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleDeleteCompany(company.id, company.companyName)}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </Button>
                        </>
                      )}
                      {selectedCompany === company.id ? (
                        <Button size="sm" onClick={() => setSelectedCompany(null)} className="bg-white/95 hover:bg-white text-slate-800 font-semibold shadow-lg">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          Close
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => { setSelectedCompany(company.id); setShowAddInterview(false); }} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-lg">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Details */}
                {selectedCompany === company.id && (
                  <div className="p-8 border-t border-slate-800 bg-[#1a1f28] rounded-b-xl">
                    {/* Company Information Grid */}
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="inline-block w-1 h-6 bg-amber-500 rounded"></span>
                        Company Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg p-5 hover:border-amber-500/50 transition-colors">
                          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Industry</p>
                          <p className="text-white font-semibold text-lg">{company.industry || "Not specified"}</p>
                        </div>
                        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg p-5 hover:border-amber-500/50 transition-colors">
                          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Company Size</p>
                          <p className="text-white font-semibold text-lg capitalize">{company.size || "Not specified"}</p>
                        </div>
                        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg p-5 hover:border-amber-500/50 transition-colors">
                          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Website</p>
                          <p className="text-white font-semibold text-lg truncate">
                            {company.website ? (
                              <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 hover:underline">
                                {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                              </a>
                            ) : (
                              <span className="text-slate-500">Not specified</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Add Interview Form */}
                    {showAddInterview && (
                      <form onSubmit={handleAddInterview} className="mb-6 p-4 glass-card">
                        <h3 className="font-bold text-white mb-4">Record Interview</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-200 mb-2">Position</label>
                              <input
                                type="text"
                                value={newInterview.position}
                                onChange={(e) => setNewInterview({ ...newInterview, position: e.target.value })}
                                placeholder="e.g., Senior Software Engineer"
                                className="w-full px-4 py-2 bg-[#181c24] border border-purple-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="interview-stage" className="block text-sm font-medium text-slate-200 mb-2">Interview Stage</label>
                              <select
                                id="interview-stage"
                                value={newInterview.stage}
                                onChange={(e) => setNewInterview({ ...newInterview, stage: e.target.value })}
                                className="w-full px-4 py-2 bg-[#181c24] border border-purple-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="phone_screen">Phone Screen</option>
                                <option value="technical">Technical</option>
                                <option value="onsite">Onsite</option>
                                <option value="offer">Offer</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label htmlFor="interview-status" className="block text-sm font-medium text-slate-200 mb-2">Status</label>
                            <select
                              id="interview-status"
                              value={newInterview.status}
                              onChange={(e) => setNewInterview({ ...newInterview, status: e.target.value })}
                              className="w-full px-4 py-2 bg-[#181c24] border border-purple-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-200 mb-2">Feedback (optional)</label>
                            <textarea
                              value={newInterview.feedback}
                              onChange={(e) => setNewInterview({ ...newInterview, feedback: e.target.value })}
                              placeholder="How did the interview go?"
                              rows={3}
                              className="w-full px-4 py-2 bg-[#181c24] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" className="flex-1 glass-card bg-green-700/80 hover:bg-green-800/90 text-white">Save Interview</Button>
                            <Button type="button" onClick={() => setShowAddInterview(false)} className="flex-1 glass-card bg-slate-700/80 hover:bg-slate-800/90 text-white">Cancel</Button>
                          </div>
                        </div>
                      </form>
                    )}

                    {!showAddInterview && (
                      <Button onClick={() => setShowAddInterview(true)} className="mb-6 glass-card bg-blue-700/80 hover:bg-blue-800/90 text-white">+ Add Interview</Button>
                    )}

                    {/* Interview History */}
                    {company.interviews && company.interviews.length > 0 ? (
                      <div className="space-y-3">
                        <h3 className="font-bold text-white">Interview History</h3>
                        {company.interviews.map((interview: any) => (
                          <div key={interview.id} className="p-4 border border-slate-800 rounded glass-card bg-[#181c24]">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-white">{interview.position}</p>
                                <div className="flex gap-2 mt-2">
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${getStageColor(interview.stage)} bg-opacity-80 backdrop-blur-md`}>{interview.stage?.replace("_", " ")}</span>
                                  <span className={`text-xs font-medium ${getStatusColor(interview.status)}`}>{interview.status?.replace("_", " ")}</span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-400">{new Date(interview.createdAt).toLocaleDateString()}</p>
                            </div>
                            {interview.feedback && (
                              <p className="text-sm text-slate-300 mt-3">{interview.feedback}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-center py-4">No interviews recorded yet</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
