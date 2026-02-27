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
    setLoading(true);
    const result = await getUserCompanyInterviews();
    if (result.success) {
      setCompanies(result.interviews || []);
    }
    setLoading(false);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
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
      fetchCompanyInterviews();
    }
  };

  const handleAddInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

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
      fetchCompanyInterviews();
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Company Interviews
            </h1>
            <p className="text-slate-600 mt-2">
              Track your interviews with different companies
            </p>
          </div>
          <Button
            onClick={() => setShowCreateCompany(!showCreateCompany)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showCreateCompany ? "Cancel" : "+ New Company"}
          </Button>
        </div>

        {/* Create Company Form */}
        {showCreateCompany && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Add Company</h2>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={newCompany.name}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, name: e.target.value })
                    }
                    placeholder="e.g., Google, Meta, Amazon"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={newCompany.industry}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, industry: e.target.value })
                    }
                    placeholder="e.g., Technology, Finance"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-size" className="block text-sm font-medium text-slate-700 mb-2">
                    Company Size
                  </label>
                  <select
                    id="company-size"
                    value={newCompany.size}
                    onChange={(e) =>
                      setNewCompany({
                        ...newCompany,
                        size: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="startup">Startup (1-50)</option>
                    <option value="small">Small (50-500)</option>
                    <option value="medium">Medium (500-5000)</option>
                    <option value="large">Large (5000+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Website (optional)
                  </label>
                  <input
                    type="url"
                    value={newCompany.website}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, website: e.target.value })
                    }
                    placeholder="https://company.com"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Add Company
              </Button>
            </form>
          </div>
        )}

        {/* Companies List */}
        {companies.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No companies added yet
            </h3>
            <p className="text-slate-600">
              Add your first company to start tracking interviews
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {companies.map((company) => (
              <div key={company.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Company Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {company.companyName || "Unknown Company"}
                      </h2>
                      <p className="text-blue-100 mt-1">
                        Style: {company.interviewStyle?.replace("_", " ")}
                      </p>
                    </div>
                    {selectedCompany === company.id ? (
                      <Button
                        size="sm"
                        onClick={() => setSelectedCompany(null)}
                        className="bg-white text-blue-600 hover:bg-blue-50"
                      >
                        Close
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCompany(company.id);
                          setShowAddInterview(false);
                        }}
                        className="bg-white text-blue-600 hover:bg-blue-50"
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>

                {/* Company Details */}
                {selectedCompany === company.id && (
                  <div className="p-6 border-t">
                    {/* Add Interview Form */}
                    {showAddInterview && (
                      <form onSubmit={handleAddInterview} className="mb-6 p-4 bg-slate-50 rounded">
                        <h3 className="font-bold mb-4">Record Interview</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Position
                              </label>
                              <input
                                type="text"
                                value={newInterview.position}
                                onChange={(e) =>
                                  setNewInterview({
                                    ...newInterview,
                                    position: e.target.value,
                                  })
                                }
                                placeholder="e.g., Senior Software Engineer"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="interview-stage" className="block text-sm font-medium text-slate-700 mb-2">
                                Interview Stage
                              </label>
                              <select
                                id="interview-stage"
                                value={newInterview.stage}
                                onChange={(e) =>
                                  setNewInterview({
                                    ...newInterview,
                                    stage: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="phone_screen">Phone Screen</option>
                                <option value="technical">Technical</option>
                                <option value="onsite">Onsite</option>
                                <option value="offer">Offer</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label htmlFor="interview-status" className="block text-sm font-medium text-slate-700 mb-2">
                              Status
                            </label>
                            <select
                              id="interview-status"
                              value={newInterview.status}
                              onChange={(e) =>
                                setNewInterview({
                                  ...newInterview,
                                  status: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Feedback (optional)
                            </label>
                            <textarea
                              value={newInterview.feedback}
                              onChange={(e) =>
                                setNewInterview({
                                  ...newInterview,
                                  feedback: e.target.value,
                                })
                              }
                              placeholder="How did the interview go?"
                              rows={3}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              Save Interview
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setShowAddInterview(false)}
                              className="flex-1 bg-slate-400 hover:bg-slate-500"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </form>
                    )}

                    {!showAddInterview && (
                      <Button
                        onClick={() => setShowAddInterview(true)}
                        className="mb-6 bg-blue-600 hover:bg-blue-700"
                      >
                        + Add Interview
                      </Button>
                    )}

                    {/* Interview History */}
                    {company.interviews && company.interviews.length > 0 ? (
                      <div className="space-y-3">
                        <h3 className="font-bold text-slate-900">
                          Interview History
                        </h3>
                        {company.interviews.map((interview: any) => (
                          <div
                            key={interview.id}
                            className="p-4 border border-slate-200 rounded"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {interview.position}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${getStageColor(interview.stage)}`}>
                                    {interview.stage?.replace("_", " ")}
                                  </span>
                                  <span className={`text-xs font-medium ${getStatusColor(interview.status)}`}>
                                    {interview.status?.replace("_", " ")}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-600">
                                {new Date(interview.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {interview.feedback && (
                              <p className="text-sm text-slate-600 mt-3">
                                {interview.feedback}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-600 text-center py-4">
                        No interviews recorded yet
                      </p>
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
