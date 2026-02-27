"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCompanies, getCompanyDetails, getCompanyQuestions } from "@/lib/actions/features.action";

export default function CompanyDatabasePage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    const filtered = companies.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
  }, [searchTerm, companies]);

  async function fetchCompanies() {
    setLoading(true);
    const result = await getCompanies();
    if (result.success && result.companies) {
      setCompanies(result.companies);
    }
    setLoading(false);
  }

  async function handleSelectCompany(company: any) {
    setSelectedCompany(company);
    const questionsResult = await getCompanyQuestions(company.name);
    if (questionsResult.success) {
      setQuestions(questionsResult.questions || []);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#181c24] to-[#23272f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white">Company Database</h1>
          <p className="text-slate-300 mt-2">
            Explore interview processes and questions from real companies
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Companies List */}
          <div>
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white mb-4"
            />

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-slate-300">Loading...</div>
              ) : (
                filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => handleSelectCompany(company)}
                    className={`glass-card p-4 cursor-pointer hover:shadow-lg transition ${
                      selectedCompany?.id === company.id ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <h3 className="font-semibold text-white">{company.name}</h3>
                    <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
                      <span className="bg-slate-700/50 px-2 py-1 rounded">
                        {company.averageDifficulty?.toUpperCase() || "N/A"}
                      </span>
                      <span>👍 {company.upvotes || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Company Details */}
          {selectedCompany ? (
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card p-6">
                <h2 className="text-2xl font-bold text-white mb-4">{selectedCompany.name}</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">Interview Process</h3>
                    <p className="text-slate-400">{selectedCompany.interviewProcess || "No info"}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">Culture Fit</h3>
                    <p className="text-slate-400">{selectedCompany.cultureFit || "No info"}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">Salary Range</h3>
                    <p className="text-white">
                      ${selectedCompany.salaryRange?.min || "N/A"} - ${selectedCompany.salaryRange?.max || "N/A"}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">Difficulty</h3>
                    <p className="text-white font-semibold">
                      {selectedCompany.averageDifficulty?.toUpperCase() || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-4">Interview Questions ({questions.length})</h3>
                <div className="space-y-2">
                  {questions.length > 0 ? (
                    questions.map((q) => (
                      <div key={q.id} className="bg-slate-700/30 p-3 rounded">
                        <p className="text-white mb-1">{q.question}</p>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                          <span className="bg-slate-700 px-2 py-1 rounded">{q.difficulty}</span>
                          <span>👍 {q.upvotes || 0}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">No questions yet. Be the first to add one!</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 glass-card p-12 flex items-center justify-center">
              <p className="text-slate-300">Select a company to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
