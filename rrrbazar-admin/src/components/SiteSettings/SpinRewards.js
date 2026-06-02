import React, { useEffect, useState } from 'react';
import parse from 'html-react-parser';
import { toast } from 'react-toastify';
import axiosInstance from '../../common/axios';
import { getErrors, toastDefault } from '../../utils/handler.utils';
import Loader from '../Loader/Loader';
import TextEditor from '../TextEditor/TextEditor';

// The Draft-WYSIWYG editor still emits a single `<p></p>` (or
// `<p><br></p>`) when the user has typed nothing — `.trim()` against
// raw HTML therefore reports the label as non-empty even when it is.
// Strip tags + entities before deciding the field is empty.
function isHtmlEmpty(html) {
  return (
    String(html || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, ' ')
      .trim().length === 0
  );
}

const EMPTY_FORM = {
  label: '',
  type: 'coin',
  amount: 0,
  weight: 1,
  color: '#f59e0b',
  icon: '',
  is_active: 1,
  serial: 0,
};

// Admin CRUD for spin wheel rewards. Lives under SiteSettings since it's
// fundamentally site configuration. Each row is a wheel segment; the wheel
// renders them in `serial` order, and the server picks winners using
// `weight`. Type defaults to "coin" but is open-ended.
function SpinRewards() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [siteSettings, setSiteSettings] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/spin-rewards');
      setRows(res?.data?.data || []);
    } catch (e) {
      toast.error(getErrors(e, false, true), toastDefault);
    }
    try {
      const s = await axiosInstance.get('/admin/site-settings');
      setSiteSettings(s?.data?.data || null);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      label: row.label || '',
      type: row.type || 'coin',
      amount: row.amount || 0,
      weight: row.weight || 1,
      color: row.color || '#f59e0b',
      icon: row.icon || '',
      is_active: row.is_active ? 1 : 0,
      serial: row.serial || 0,
    });
  };
  const resetForm = () => { setEditingId(null); setForm(EMPTY_FORM); };

  const submit = async (e) => {
    e.preventDefault();
    if (isHtmlEmpty(form.label)) {
      toast.error('Label is required', toastDefault);
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await axiosInstance.post(`/admin/spin-rewards/update/${editingId}`, form);
        toast.success('Reward updated', toastDefault);
      } else {
        await axiosInstance.post('/admin/spin-rewards/create', form);
        toast.success('Reward created', toastDefault);
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error(getErrors(err, false, true), toastDefault);
    } finally { setLoading(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this reward?')) return;
    setLoading(true);
    try {
      await axiosInstance.post(`/admin/spin-rewards/delete/${id}`);
      toast.success('Deleted', toastDefault);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      toast.error(getErrors(err, false, true), toastDefault);
    } finally { setLoading(false); }
  };

  const saveSpinSettings = async (patch) => {
    setLoading(true);
    try {
      await axiosInstance.post('/admin/site-settings/update', patch);
      toast.success('Spin settings updated', toastDefault);
      await load();
    } catch (err) {
      toast.error(getErrors(err, false, true), toastDefault);
    } finally { setLoading(false); }
  };

  const totalWeight = rows.filter((r) => r.is_active).reduce((a, r) => a + Number(r.weight || 0), 0) || 1;

  return (
    <section className="relative container_admin">
      <div className="bg-white overflow-hidden rounded">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">Spin Rewards</h3>
          <span className="text-xs text-gray-500">
            {rows.length} reward(s) · {rows.filter((r) => r.is_active).length} active
          </span>
        </div>

        <div className="p-4 md:p-6">
          {loading && <Loader absolute />}

          {/* Cost / daily limit row */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-1">Cost per spin (coins)</label>
              <input
                type="number"
                min="0"
                className="form_input"
                defaultValue={siteSettings?.spin_cost_coins ?? 0}
                onBlur={(e) => saveSpinSettings({ spin_cost_coins: parseInt(e.target.value || 0, 10) })}
              />
              <p className="text-xs text-gray-500 mt-1">0 = free</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Daily spin limit</label>
              <input
                type="number"
                min="0"
                className="form_input"
                defaultValue={siteSettings?.spin_daily_limit ?? 0}
                onBlur={(e) => saveSpinSettings({ spin_daily_limit: parseInt(e.target.value || 0, 10) })}
              />
              <p className="text-xs text-gray-500 mt-1">0 = no limit</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
              <p className="font-semibold mb-1">Tips</p>
              <ul className="list-disc list-inside text-gray-600 text-xs space-y-0.5">
                <li>Each row is one wheel segment.</li>
                <li>Higher <code>weight</code> = more likely to win.</li>
                <li><code>type</code> defaults to <code>coin</code>; use <code>none</code> for "Try Again".</li>
                <li>Wheel renders inactive rewards as hidden.</li>
              </ul>
            </div>
          </div>

          {/* Add/edit form */}
          <form onSubmit={submit} className="border border-gray-200 rounded p-4 mb-6">
            <h4 className="font-bold mb-3">{editingId ? `Edit reward #${editingId}` : 'Add a reward'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-4">
                <label className="text-xs">Label</label>
                <TextEditor
                  value={form.label}
                  onHtmlChange={(html) => onField('label', html)}
                  minHeight={120}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Rich text is rendered in the "You won" banner and the spin
                  history. The wheel itself shows the plain-text version
                  (formatting is stripped to fit inside a pie slice).
                </p>
              </div>
              <div>
                <label className="text-xs">Type</label>
                <input className="form_input" value={form.type} onChange={(e) => onField('type', e.target.value)} placeholder="coin / wallet / none" />
              </div>
              <div>
                <label className="text-xs">Amount</label>
                <input type="number" className="form_input" value={form.amount} onChange={(e) => onField('amount', e.target.value)} />
              </div>
              <div>
                <label className="text-xs">Weight</label>
                <input type="number" min="0" className="form_input" value={form.weight} onChange={(e) => onField('weight', e.target.value)} />
              </div>
              <div>
                <label className="text-xs">Color</label>
                <div className="flex gap-2">
                  <input type="color" value={form.color || '#f59e0b'} onChange={(e) => onField('color', e.target.value)} className="w-12 h-10 p-0 border-0 cursor-pointer" />
                  <input className="form_input flex-1" value={form.color || ''} onChange={(e) => onField('color', e.target.value)} placeholder="#f59e0b" />
                </div>
              </div>
              <div>
                <label className="text-xs">Icon (optional)</label>
                <input className="form_input" value={form.icon || ''} onChange={(e) => onField('icon', e.target.value)} placeholder="emoji or name" />
              </div>
              <div>
                <label className="text-xs">Serial (order)</label>
                <input type="number" className="form_input" value={form.serial} onChange={(e) => onField('serial', e.target.value)} />
              </div>
              <div>
                <label className="text-xs block">Active</label>
                <label className="inline-flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => onField('is_active', e.target.checked ? 1 : 0)} />
                  <span className="text-sm">Show on the wheel</span>
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button type="submit" className="cstm_btn">{editingId ? 'Save changes' : 'Add reward'}</button>
              {editingId && (
                <button type="button" onClick={resetForm} className="cstm_btn !bg-gray-300 !text-gray-700">Cancel</button>
              )}
            </div>
          </form>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Weight</th>
                  <th>Chance</th>
                  <th>Serial</th>
                  <th>Active</th>
                  <th>Color</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={10} className="text-center text-gray-500 py-3">No rewards yet.</td></tr>
                )}
                {rows.map((r) => {
                  const chance = r.is_active ? Math.round((Number(r.weight || 0) / totalWeight) * 100) : 0;
                  return (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td className="font-semibold">{parse(String(r.label || ''))}</td>
                      <td className="capitalize">{r.type}</td>
                      <td>{r.amount}</td>
                      <td>{r.weight}</td>
                      <td>{r.is_active ? `${chance}%` : '—'}</td>
                      <td>{r.serial}</td>
                      <td>{r.is_active ? 'Yes' : 'No'}</td>
                      <td>
                        <span style={{ background: r.color || '#999', display: 'inline-block', width: 18, height: 18, borderRadius: 4, verticalAlign: 'middle' }} />
                        <span className="ml-2 text-xs text-gray-500">{r.color}</span>
                      </td>
                      <td className="text-right">
                        <button type="button" onClick={() => startEdit(r)} className="text-blue-600 mr-3">Edit</button>
                        <button type="button" onClick={() => del(r.id)} className="text-red-600">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SpinRewards;
