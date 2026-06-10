import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import axios from "../../common/axios";
import { toastDefault, getErrors } from "../../utils/handler.utils";
import Loader from "../Loader/Loader";

// Security center: the admin's currently logged-in devices (with the ability
// to log a device out remotely / "log out everywhere else") and a login audit
// trail. Backed by /admin/sessions and /admin/login-audit.
function SecuritySessions() {
  const [sessions, setSessions] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get("admin/sessions"),
      axios.get("admin/login-audit?limit=50"),
    ])
      .then(([s, a]) => {
        setSessions(s?.data?.data || []);
        setAudit(a?.data?.data || []);
      })
      .catch((err) => toast.error(getErrors(err, false, true), toastDefault))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revokeOne = async (id) => {
    setBusy(true);
    try {
      await axios.post(`admin/sessions/revoke/${id}`);
      toast.success("Device logged out", toastDefault);
      load();
    } catch (err) {
      toast.error(getErrors(err, false, true), toastDefault);
    } finally {
      setBusy(false);
    }
  };

  const revokeOthers = async () => {
    setBusy(true);
    try {
      const res = await axios.post("admin/sessions/revoke-others");
      toast.success(res?.data?.message || "Other devices logged out", toastDefault);
      load();
    } catch (err) {
      toast.error(getErrors(err, false, true), toastDefault);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="relative container_admin">
      {(loading || busy) && <Loader absolute />}

      {/* Devices */}
      <div className="bg-white rounded shadow mb-6">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">
            Logged-in devices ({sessions.length})
          </h3>
          <button
            type="button"
            onClick={revokeOthers}
            disabled={busy || sessions.length <= 1}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded"
          >
            Log out all other devices
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">Device</th>
                <th className="py-2 pr-3">IP</th>
                <th className="py-2 pr-3">Last active</th>
                <th className="py-2 pr-3">Expires</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-4 text-gray-400 italic">
                    No active sessions.
                  </td>
                </tr>
              )}
              {sessions.map((s) => (
                <tr key={s.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 max-w-[280px]">
                    <span className="break-words">{s.user_agent || "Unknown device"}</span>
                    {s.current && (
                      <span className="ml-2 inline-block bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        THIS DEVICE
                      </span>
                    )}
                    {Number(s.remember) === 1 && (
                      <span className="ml-2 inline-block bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        REMEMBERED
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{s.ip || "—"}</td>
                  <td className="py-2 pr-3">{fmt(s.last_seen_at)}</td>
                  <td className="py-2 pr-3">{fmt(s.expires_at)}</td>
                  <td className="py-2 pr-3 text-right">
                    {!s.current && (
                      <button
                        type="button"
                        onClick={() => revokeOne(s.id)}
                        disabled={busy}
                        className="text-red-600 hover:text-red-800 font-semibold disabled:opacity-50"
                      >
                        Log out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Login history */}
      <div className="bg-white rounded shadow">
        <div className="px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-bold text-black">Login history</h3>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Result</th>
                <th className="py-2 pr-3">Reason</th>
                <th className="py-2 pr-3">IP</th>
                <th className="py-2 pr-3">Device</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-4 text-gray-400 italic">
                    No login history yet.
                  </td>
                </tr>
              )}
              {audit.map((a) => (
                <tr key={a.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 whitespace-nowrap">{fmt(a.created_at)}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        Number(a.success) === 1
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {Number(a.success) === 1 ? "SUCCESS" : "FAILED"}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{a.reason || "—"}</td>
                  <td className="py-2 pr-3">{a.ip || "—"}</td>
                  <td className="py-2 pr-3 max-w-[280px] break-words">
                    {a.user_agent || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default SecuritySessions;
