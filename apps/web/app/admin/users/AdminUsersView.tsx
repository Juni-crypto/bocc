"use client";

import { useEffect, useState } from "react";
import { Bezel } from "@/components/Bezel";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AdminUser, UserRole } from "@/lib/types";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

export function AdminUsersView() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.admin
      .users(token)
      .then((list) => active && setUsers(list))
      .catch((e) => active && setError(e?.message ?? "Could not load users."));
    return () => {
      active = false;
    };
  }, [token]);

  const setRole = async (id: string, role: UserRole) => {
    if (!token) return;
    setBusy(id);
    setError(null);
    try {
      await api.admin.setRole(id, role, token);
      setUsers((prev) => (prev ? prev.map((u) => (u.id === id ? { ...u, role } : u)) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change role.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-white/55">Promote a host to admin, or demote back to a regular user.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </p>
      )}

      {users === null && !error && <p className="text-sm text-white/45" aria-busy="true">Loading users…</p>}

      {users !== null && users.length === 0 && <p className="text-sm text-white/45">No users yet.</p>}

      {users && users.length > 0 && (
        <Bezel coreClassName="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">All platform users</caption>
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-white/45">
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">Email</th>
                <th scope="col" className="px-4 py-3 font-medium">Role</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Events</th>
                <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => {
                const isMe = me?.id === u.id;
                const isAdmin = u.role === "ADMIN";
                const rowBusy = busy === u.id;
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-white/90">
                      {u.name}
                      {isMe && <span className="ml-2 text-[11px] text-lime">you</span>}
                    </td>
                    <td className="px-4 py-3 text-white/60">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          isAdmin
                            ? "border-lime/40 bg-lime/10 text-lime"
                            : "border-white/15 bg-white/[0.04] text-white/60"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/70">{u.events}</td>
                    <td className="px-4 py-3 text-white/50">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() => setRole(u.id, isAdmin ? "USER" : "ADMIN")}
                        className={`min-h-[40px] rounded-full border px-4 py-2 text-xs font-medium transition ${focusRing} ${
                          isAdmin
                            ? "border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                            : "border-lime/40 bg-lime/10 text-lime hover:bg-lime/20"
                        }`}
                      >
                        {rowBusy ? "Saving…" : isAdmin ? "Demote to user" : "Promote to admin"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Bezel>
      )}
    </div>
  );
}
