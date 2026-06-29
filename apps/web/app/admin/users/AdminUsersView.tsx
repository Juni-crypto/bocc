"use client";

import { useEffect, useState } from "react";
import { Bezel } from "@/components/Bezel";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AdminUser, UserRole } from "@/lib/types";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

const fieldClass = `min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 transition focus:border-lime/40 ${focusRing}`;

export function AdminUsersView() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // create-host form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setNewRole] = useState<UserRole>("USER");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  const setRole = async (id: string, nextRole: UserRole) => {
    if (!token) return;
    setBusy(id);
    setError(null);
    try {
      await api.admin.setRole(id, nextRole, token);
      setUsers((prev) =>
        prev ? prev.map((u) => (u.id === id ? { ...u, role: nextRole } : u)) : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change role.");
    } finally {
      setBusy(null);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreateError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setCreateError("Enter a name.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      setCreateError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setCreateError("Password must be at least 8 characters.");
      return;
    }

    setCreating(true);
    try {
      const created = await api.admin.createUser(
        { name: trimmedName, email: trimmedEmail, password, role },
        token,
      );
      setUsers((prev) => (prev ? [created, ...prev] : [created]));
      setName("");
      setEmail("");
      setPassword("");
      setNewRole("USER");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create host.");
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (u: AdminUser) => {
    if (!token) return;
    if (!window.confirm(`Delete ${u.name} (${u.email})? This cannot be undone.`)) {
      return;
    }
    setBusy(u.id);
    setError(null);
    try {
      await api.admin.deleteUser(u.id, token);
      setUsers((prev) => (prev ? prev.filter((x) => x.id !== u.id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete host.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-white/55">
          Add hosts, change roles, or remove accounts. Hosts can run their own events; admins can run the console.
        </p>
      </div>

      {/* create host */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-white/80">Create host</h2>
        <Bezel coreClassName="p-5">
          <form onSubmit={createUser} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-name" className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Name
                </label>
                <input
                  id="new-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={fieldClass}
                  placeholder="Casey Host"
                />
              </div>
              <div>
                <label htmlFor="new-email" className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Email
                </label>
                <input
                  id="new-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                  placeholder="casey@example.com"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                  placeholder="At least 8 characters"
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="new-role" className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Role
                </label>
                <select
                  id="new-role"
                  value={role}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className={`${fieldClass} appearance-none`}
                >
                  <option value="USER">Host</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            {createError && (
              <p role="alert" className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
                {createError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className={`min-h-[44px] rounded-full bg-lime px-5 py-3 text-sm font-semibold text-ink transition hover:bg-lime/90 disabled:opacity-60 ${focusRing}`}
              >
                {creating ? "Creating…" : "Create host"}
              </button>
            </div>
          </form>
        </Bezel>
      </section>

      {/* user list */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white/80">All users</h2>

        {error && (
          <p role="alert" className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </p>
        )}

        {users === null && !error && (
          <p className="text-sm text-white/45" aria-busy="true">
            Loading users…
          </p>
        )}

        {users !== null && users.length === 0 && <p className="text-sm text-white/45">No users yet.</p>}

        {users && users.length > 0 && (
          <Bezel coreClassName="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">All platform users</caption>
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.12em] text-white/45">
                  <th scope="col" className="px-4 py-3 font-medium">Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Email</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Events</th>
                  <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() => setRole(u.id, isAdmin ? "USER" : "ADMIN")}
                            className={`min-h-[44px] rounded-full border px-4 py-2 text-xs font-medium transition disabled:opacity-60 ${focusRing} ${
                              isAdmin
                                ? "border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                                : "border-lime/40 bg-lime/10 text-lime hover:bg-lime/20"
                            }`}
                          >
                            {rowBusy ? "Saving…" : isAdmin ? "Demote to user" : "Promote to admin"}
                          </button>
                          {!isMe && (
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => deleteUser(u)}
                              className={`min-h-[44px] rounded-full border border-coral/40 bg-coral/10 px-4 py-2 text-xs font-medium text-coral transition hover:bg-coral/20 disabled:opacity-60 ${focusRing}`}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Bezel>
        )}
      </section>
    </div>
  );
}
