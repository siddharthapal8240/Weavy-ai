"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, Clock, Trash2, LayoutGrid } from "lucide-react";
import {
  getUserWorkflowsAction,
  deleteWorkflowAction,
  saveWorkflowAction,
} from "@/app/actions/workflowActions";
import { useUser, UserButton } from "@clerk/nextjs";
import { DEMO_WORKFLOWS } from "@/lib/demoWorkflows";
import Sidebar from "@/components/workflow/Sidebar";
import SidebarNavigation from "@/components/workflow/SidebarNavigation";
import type { Workflow } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      const res = await getUserWorkflowsAction();
      if (res.success && res.workflows) {
        const sorted = res.workflows.sort(
          (a: any, b: any) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setWorkflows(sorted as Workflow[]);
      }
      setLoading(false);
    };

    if (isUserLoaded) {
      fetchWorkflows();
    }
  }, [isUserLoaded]);

  const handleCreateNew = async () => {
    setCreating(true);
    try {
      const result = await saveWorkflowAction({
        name: "Untitled Workflow",
        nodes: [],
        edges: [],
      });

      if (result.success && result.id) {
        router.push(`/workflows/${result.id}`);
      } else {
        alert(`Failed to create workflow: ${result.error}`);
        setCreating(false);
      }
    } catch (error) {
      console.error("Error creating workflow:", error);
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    const res = await deleteWorkflowAction(id);
    if (res.success) {
      setWorkflows(workflows.filter((wf) => wf.id !== id));
    }
  };

  const filteredWorkflows = workflows.filter((wf) =>
    wf.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} m ago`;
    if (diffHours < 24) return `${diffHours} h ago`;
    if (diffDays < 7) return `${diffDays} d ago`;
    return past.toLocaleDateString();
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white font-sans">
      <Sidebar className="hidden md:flex md:w-[250px] border-r border-white/5">
        <SidebarNavigation onCreateNew={handleCreateNew} creating={creating} />
      </Sidebar>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-[#0a0a0a] shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-sm text-white/90">
              {isUserLoaded && user?.firstName
                ? `${user.firstName.toUpperCase()}'s Workspace`
                : "MY WORKSPACE"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleCreateNew}
              disabled={creating}
              className="cursor-pointer flex items-center gap-2 bg-[#F7FFA8] text-black px-4 py-2 rounded-lg text-xs hover:bg-[#edf3bc] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_-3px_rgba(223,255,79,0.3)]"
            >
              {creating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} strokeWidth={3} />
              )}
              {creating ? "Creating..." : "Create New File"}
            </button>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {/* --- WORKFLOW LIBRARY SECTION --- */}
          <section className="mb-10">
            <div className="flex items-center gap-6 mb-6 border-b border-white/5">
              <button className="pb-3 text-sm font-medium text-white border-b-2 border-white/60">
                Workflow library
              </button>
              <button className="pb-3 text-sm font-medium text-white/40 hover:text-white/60 transition-colors">
                Tutorials
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
              {DEMO_WORKFLOWS.map((demo) => (
                <Link
                  key={demo.id}
                  href={`/workflows/${demo.id}`}
                  className="group relative min-w-[200px] md:min-w-[240px] aspect-[16/10] rounded-xl overflow-hidden border border-white/5 bg-[#111] transition-all hover:border-white/20"
                >
                  {/* Image Background */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

                  <div className="absolute inset-0 bg-[#1a1a1a]">
                    {(demo as any).image ? (
                      <img
                        src={(demo as any).image}
                        alt={demo.name}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                        <WorkflowIcon size={64} />
                      </div>
                    )}
                  </div>

                  {/* Content Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 z-20 bg-gradient-to-t from-black/90 to-transparent">
                    <h3 className="text-sm font-bold text-white mb-0.5 group-hover:text-[#F7FFA8] transition-colors">
                      {demo.name}
                    </h3>
                    <p className="text-[11px] text-white/50 line-clamp-1">
                      {demo.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 className="text-base text-white">My files</h2>

              <div className="relative w-full md:w-auto">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-64 bg-[#111] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all focus:bg-[#161616]"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center p-20">
                <Loader2 className="animate-spin text-[#dfff4f]" size={32} />
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/30">
                  <LayoutGrid size={24} />
                </div>
                <p className="text-white/50 text-sm">
                  {searchQuery
                    ? "No workflows found matching your search."
                    : "No files yet. Create one to get started!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredWorkflows.map((wf) => (
                  <Link
                    key={wf.id}
                    href={`/workflows/${wf.id}`}
                    className="group flex flex-col bg-[#111] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="h-32 bg-[#161616] relative flex items-center justify-center group-hover:bg-[#1a1a1a] transition-colors border-b border-white/5">
                      <div className="text-white/10 group-hover:text-[#dfff4f]/20 transition-colors transform group-hover:scale-110 duration-500">
                        <WorkflowIcon size={48} />
                      </div>
                    </div>

                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="overflow-hidden">
                        <h3 className="  text-sm text-white truncate group-hover:text-[#dfff4f] transition-colors">
                          {wf.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5 text-white/40">
                          <Clock size={10} />
                          <p className="text-[10px] font-medium">
                            Edited {getRelativeTime(wf.updated_at)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDelete(wf.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-white/30 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function WorkflowIcon({ size }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <path d="M10 6.5h4" />
      <path d="M17.5 10v4" />
      <path d="M6.5 10v8" />
    </svg>
  );
}
