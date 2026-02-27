"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getForumPosts, createForumPost, replyToPost, getForumReplies } from "@/lib/actions/community.action";

export default function ForumPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const result = await getForumPosts("", "recent", 20);
    if (result.success && result.posts) {
      setPosts(result.posts);
    }
    setLoading(false);
  }

  async function handleCreatePost() {
    if (!formData.title || !formData.content) return;

    const result = await createForumPost(
      formData.title,
      formData.content,
      formData.category as any,
      []
    );

    if (result.success) {
      setFormData({ title: "", content: "", category: "general" });
      setShowCreateForm(false);
      await fetchPosts();
    }
  }

  async function handleSelectPost(post: any) {
    setSelectedPost(post);
    const repliesResult = await getForumReplies(post.id);
    if (repliesResult.success) {
      setReplies(repliesResult.replies || []);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#181c24] to-[#23272f]">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Community Forum</h1>
            <p className="text-slate-300 mt-2">Share questions, tips, and interview experiences</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {showCreateForm ? "Cancel" : "+ New Discussion"}
          </Button>
        </div>

        {/* Create Post Form */}
        {showCreateForm && (
          <div className="glass-card p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Start a Discussion</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Discussion Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="dsa">DSA</option>
                <option value="system_design">System Design</option>
                <option value="behavioral">Behavioral</option>
                <option value="tips">Tips & Tricks</option>
              </select>

              <textarea
                placeholder="Share your thoughts, question, or experience..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 bg-[#23272f] border border-blue-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <Button
                onClick={handleCreatePost}
                className="bg-green-600 hover:bg-green-700 text-white w-full"
              >
                Post Discussion
              </Button>
            </div>
          </div>
        )}

        {/* Posts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handleSelectPost(post)}
                    className="glass-card p-6 cursor-pointer hover:shadow-lg transition"
                  >
                    <h3 className="text-xl font-bold text-white">{post.title}</h3>
                    <p className="text-slate-300 text-sm mt-2">{post.content.substring(0, 150)}...</p>
                    <div className="flex justify-between items-center mt-4 text-sm text-slate-400">
                      <span className="bg-blue-700/20 text-blue-300 px-2 py-1 rounded">
                        {post.category?.replace("_", " ").toUpperCase()}
                      </span>
                      <div className="flex gap-4">
                        <span>👍 {post.upvotes}</span>
                        <span>💬 {post.replies}</span>
                        <span>👁️ {post.views}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Categories */}
          <div className="glass-card p-6 h-fit">
            <h3 className="text-lg font-bold text-white mb-4">Categories</h3>
            <div className="space-y-2">
              {["general", "dsa", "system_design", "behavioral", "tips"].map((cat) => (
                <div
                  key={cat}
                  className="p-3 bg-slate-700/30 rounded hover:bg-slate-700/50 cursor-pointer"
                >
                  <p className="text-slate-300">{cat.replace("_", " ").toUpperCase()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
