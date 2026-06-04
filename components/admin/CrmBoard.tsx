"use client";
/**
 * CrmBoard — full CRM for managing leads (Req 38).
 * Lists all leads with pipeline status, detail view with timeline,
 * status change, notes, WhatsApp deep-link, and CSV export.
 */
import { useEffect, useState } from "react";
import { MessageCircle, Download, ChevronRight, X } from "lucide-react";
import Papa from "papaparse";
import { leadRepo } from "@/lib/firebase/repos";
import { projectRepo } from "@/lib/firebase/repos";
import type { Lead, LeadStatus, Project } from "@/lib/types";

const STATUS_COLORS: Record<LeadStatus, string> = {
  New:         "#3b82f6",
  Contacted:   "#8b5cf6",
  Interested:  "#f59e0b",
  Negotiating: "#f97316",
  Closed:      "#22c55e",
  Lost:        "#6b7280",
};

const ALL_STATUSES: LeadStatus[] = [
  "New", "Contacted", "Interested", "Negotiating", "Closed", "Lost",
];

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function CrmBoard() {
  const [leads,    setLeads]    = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [noteText, setNoteText] = useState("");
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<LeadStatus | "all">("all");
  const [projFilter, setProjFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [ls, ps] = await Promise.all([leadRepo.list(), projectRepo.list()]);
      setLeads(ls.sort((a, b) => b.createdAt - a.createdAt));
      setProjects(ps);
      setLoading(false);
    }
    load();
  }, []);

  function projectName(id: string): string {
    return projects.find((p) => p.id === id)?.name ?? id;
  }

  const displayed = leads.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (projFilter !== "all" && l.projectId !== projFilter) return false;
    return true;
  });

  async function changeStatus(lead: Lead, status: LeadStatus) {
    await leadRepo.changeStatus(lead.id, status);
    const updated = leads.map((l) => l.id === lead.id ? { ...l, status } : l);
    setLeads(updated);
    if (selected?.id === lead.id) setSelected((s) => s ? { ...s, status } : s);
  }

  async function addNote(lead: Lead) {
    if (!noteText.trim()) return;
    const updated = await leadRepo.addNote(lead.id, noteText.trim());
    setLeads(leads.map((l) => l.id === lead.id ? updated : l));
    setSelected(updated);
    setNoteText("");
  }

  function exportCSV() {
    const rows = displayed.map((l) => ({
      Name:    l.name,
      Contact: l.contact,
      Project: projectName(l.projectId),
      Plot:    l.plotId ?? "",
      Status:  l.status,
      Message: l.message,
      Date:    fmtDate(l.createdAt),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function openWhatsApp(lead: Lead) {
    const msg = `Hi ${lead.name}! I'm following up on your enquiry about plot ${lead.plotId ?? ""}.`;
    window.open(`https://wa.me/${lead.contact.replace(/[^\d]/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">CRM</h1>
          <p className="text-sm text-slate-500 mt-1">{leads.length} leads total · {displayed.length} shown</p>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as LeadStatus | "all")}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <select
            value={projFilter}
            onChange={(e) => setProjFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {ALL_STATUSES.map((s) => {
          const count = leads.filter((l) => l.status === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(filter === s ? "all" : s)}
              className={`rounded-xl border p-3 text-left transition ${filter === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
            >
              <div className="text-xl font-bold">{count}</div>
              <div className="text-xs mt-0.5" style={{ color: filter === s ? "rgba(255,255,255,0.7)" : STATUS_COLORS[s] }}>{s}</div>
            </button>
          );
        })}
      </div>

      {/* Main layout */}
      <div className="flex gap-5">
        {/* Leads list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-sm text-slate-500 py-8 text-center">Loading leads…</div>
          ) : displayed.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">No leads match the current filters.</div>
          ) : (
            <div className="space-y-2">
              {displayed.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelected(lead)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition hover:border-slate-300 ${selected?.id === lead.id ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">{lead.name}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={{ background: STATUS_COLORS[lead.status] + "20", color: STATUS_COLORS[lead.status] }}
                      >
                        {lead.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {lead.contact} · {projectName(lead.projectId)}
                      {lead.plotId ? ` · Plot ${lead.plotId}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">{fmtDate(lead.createdAt)}</div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lead detail panel */}
        {selected && (
          <div className="w-80 shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden h-fit sticky top-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-900">{selected.name}</span>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Contact */}
              <div>
                <div className="text-xs text-slate-500 mb-1">Contact</div>
                <div className="text-sm font-medium text-slate-900">{selected.contact}</div>
              </div>

              {/* Message */}
              {selected.message && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Message</div>
                  <div className="text-sm text-slate-700">{selected.message}</div>
                </div>
              )}

              {/* Status change */}
              <div>
                <div className="text-xs text-slate-500 mb-2">Pipeline status</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeStatus(selected, s)}
                      className={`text-xs py-1.5 rounded-lg font-medium transition ${selected.status === s ? "text-white" : "text-slate-600 bg-slate-100 hover:bg-slate-200"}`}
                      style={selected.status === s ? { background: STATUS_COLORS[s] } : undefined}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp */}
              <button
                type="button"
                onClick={() => openWhatsApp(selected)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#25d366" }}
              >
                <MessageCircle size={14} /> WhatsApp
              </button>

              {/* Timeline */}
              <div>
                <div className="text-xs text-slate-500 mb-2">Timeline ({selected.timeline.length})</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selected.timeline.length === 0 && (
                    <div className="text-xs text-slate-400">No timeline entries.</div>
                  )}
                  {selected.timeline.map((entry, i) => (
                    <div key={i} className="text-xs text-slate-600 border-l-2 border-slate-200 pl-2">
                      {entry.type === "status_change"
                        ? `Status: ${entry.fromStatus ?? "–"} → ${entry.toStatus ?? "–"}`
                        : `Note: ${entry.note}`}
                      <div className="text-slate-400">{fmtDate(entry.at)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add note */}
              <div>
                <div className="text-xs text-slate-500 mb-1">Add note</div>
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none outline-none focus:border-slate-400"
                  placeholder="Write a note…"
                />
                <button
                  type="button"
                  onClick={() => addNote(selected)}
                  className="mt-1.5 w-full py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Save note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
