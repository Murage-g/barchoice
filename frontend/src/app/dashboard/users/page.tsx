"use client";
import { useEffect, useState } from "react";

export default function ManageUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cashier");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // -------------------------
  // Load Token (client-side only)
  // -------------------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("token");
      setToken(t);
    }
  }, []);

  // -------------------------
  // Load Users (when token ready)
  // -------------------------
  useEffect(() => {
    if (!token) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  // -------------------------
  // Register User
  // -------------------------
  const handleRegister = async (e: any) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch("http://127.0.0.1:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ User created successfully");
        setUsername("");
        setPassword("");
        setRole("cashier");
        setUsers((prev) => [...prev, { ...data.user, username, role }]);
      } else {
        setMessage(`❌ ${data.msg || "Failed to create user"}`);
      }
    } catch {
      setMessage("⚠️ Network error");
    }
  };

  // -------------------------
  // Delete User
  // -------------------------
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const res = await fetch(`http://127.0.0.1:5000/api/admin/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setMessage(`🗑️ ${data.msg}`);
    } else {
      setMessage(`❌ ${data.msg || "Failed to delete user"}`);
    }
  };

  // -------------------------
  // Upgrade/Demote User Role
  // -------------------------
  const handleUpgrade = async (id: number, newRole: string) => {
    const res = await fetch(`http://127.0.0.1:5000/api/admin/users/${id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
      );
      setMessage(`🔄 ${data.msg}`);
    } else {
      setMessage(`❌ ${data.msg || "Failed to update role"}`);
    }
  };

  // -------------------------
  // UI Rendering
  // -------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 sm:p-6 flex justify-center">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-6">
          👥 Manage Users
        </h1>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="cashier">Cashier</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Create User
          </button>
        </form>

        {/* Message */}
        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}

        {/* User List */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Existing Users
          </h2>

          {loading ? (
            <p className="text-center text-gray-500 text-sm">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500 text-sm">
              No users found.
            </p>
          ) : (
            <ul className="divide-y border rounded-lg overflow-hidden">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium text-gray-800">{u.username}</p>
                    <p className="text-xs text-gray-500">{u.role}</p>
                  </div>

                  <div className="flex gap-2 mt-2 sm:mt-0">
                    {u.role !== "admin" ? (
                      <button
                        onClick={() => handleUpgrade(u.id, "admin")}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200"
                      >
                        Upgrade
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(u.id, "cashier")}
                        className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full hover:bg-yellow-200"
                      >
                        Demote
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
