"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  createCompanyProfile,
  getCompanyProfile,
  recordCompanyInterview,
  getUserCompanyInterviews,
} from "@/lib/actions/company.action";

export default function CompanyInterviewsPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [loading, setLoading] = useState(true);
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
      if (result.success) {
        setCompanies(result.interviews || []);
      } else {
        setCompanies([]); // No companies yet - normal for new users
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
            className="glass-card px-6 py-2 text-base font-semibold text-white bg-blue-700/80 hover:bg-blue-800/90 shadow-lg rounded-lg"
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
                    className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="space-y-8">
            {companies.map((company) => (
              <div key={company.id} className="glass-card overflow-hidden">
                {/* Company Header */}
                <div className="bg-gradient-to-r from-blue-700/80 to-blue-900/80 p-6 text-white rounded-t-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold drop-shadow">{company.companyName || "Unknown Company"}</h2>
                      <p className="text-blue-200 mt-1">Style: {company.interviewStyle?.replace("_", " ")}</p>
                    </div>
                    {selectedCompany === company.id ? (
                      <Button size="sm" onClick={() => setSelectedCompany(null)} className="glass-card bg-white/90 text-blue-700 hover:bg-blue-100">Close</Button>
                    ) : (
                      <Button size="sm" onClick={() => { setSelectedCompany(company.id); setShowAddInterview(false); }} className="glass-card bg-white/90 text-blue-700 hover:bg-blue-100">View Details</Button>
                    )}
                  </div>
                </div>

                {/* Company Details */}
                {selectedCompany === company.id && (
                  <div className="p-8 border-t border-slate-800 bg-[#23272f] rounded-b-xl">
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
                                className="w-full px-4 py-2 bg-[#181c24] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="interview-stage" className="block text-sm font-medium text-slate-200 mb-2">Interview Stage</label>
                              <select
                                id="interview-stage"
                                value={newInterview.stage}
                                onChange={(e) => setNewInterview({ ...newInterview, stage: e.target.value })}
                                className="w-full px-4 py-2 bg-[#181c24] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              className="w-full px-4 py-2 bg-[#181c24] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
