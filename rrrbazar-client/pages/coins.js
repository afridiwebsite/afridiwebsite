import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  claimCoins,
  convertCoins,
  getCoinHistory,
  getMyCoins,
} from '../api/api';

function Coins() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');

  const load = async () => {
    try {
      const res = await getMyCoins();
      setData(res?.data?.data || null);
    } catch (e) { /* ignore */ }
    try {
      const h = await getCoinHistory();
      setHistory(h?.data?.data || []);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const onClaim = async () => {
    setBusy(true);
    try {
      const res = await claimCoins();
      toast.success(res?.data?.message || 'Coins claimed');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not claim');
    } finally { setBusy(false); }
  };

  const onConvert = async (e) => {
    e.preventDefault();
    const amt = Number(convertAmount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      const res = await convertCoins(amt);
      toast.success(res?.data?.message || 'Converted');
      setConvertAmount('');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Convert failed');
    } finally { setBusy(false); }
  };

  const coins = data?.coins || 0;
  const rate = data?.coin_to_money_rate || 0;
  const canClaim = !!data?.can_claim;

  return (
    <section className="container my-6">
      <h2 className="_h3 text-center mb-4 theme-text-primary">
        <span aria-hidden="true" className="mr-1">🪙</span> My Coins
      </h2>

      <div className="grid md:grid-cols-3 gap-4 animate-fade-in">
        <div className="bg-white rounded-md border border-gray-200 p-4 text-center">
          <div className="text-sm text-gray-500">Balance</div>
          <div className="text-3xl font-extrabold theme-text-primary">{coins}</div>
          <div className="text-xs text-gray-500 mt-1">≈ {Math.floor(coins * rate)} BDT</div>
        </div>
        <div className="bg-white rounded-md border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-2">Daily claim</div>
          <button
            onClick={onClaim}
            disabled={!canClaim || busy}
            className="theme-bg-primary w-full py-2 rounded font-semibold disabled:opacity-50 transition-transform duration-150 active:scale-95"
          >
            {canClaim ? `Claim ${data?.daily_claim_amount || 0} coins` : 'Already claimed'}
          </button>
          {!canClaim && data?.next_claim_at && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              Next claim: {new Date(data.next_claim_at).toLocaleString()}
            </div>
          )}
        </div>
        <form onSubmit={onConvert} className="bg-white rounded-md border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-2">Convert to wallet</div>
          <input
            type="number"
            min="1"
            value={convertAmount}
            onChange={(e) => setConvertAmount(e.target.value)}
            placeholder="Coins to convert"
            className="_input mb-2"
          />
          <div className="text-xs text-gray-500 mb-2">
            Rate: 1 coin = {rate} BDT
          </div>
          <button
            type="submit"
            disabled={busy || !convertAmount}
            className="theme-bg-accent w-full py-2 rounded font-semibold disabled:opacity-50 transition-transform duration-150 active:scale-95"
          >
            Convert
          </button>
        </form>
      </div>

      <div className="bg-white rounded-md border border-gray-200 p-4 mt-6 animate-fade-in">
        <h3 className="_h5 mb-2">History</h3>
        <div className="overflow-x-auto">
          <table className="table w-full text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={4} className="text-center text-gray-500 py-3">No coin activity yet.</td></tr>
              )}
              {history.map((h) => (
                <tr key={h.id} className="transition-colors hover:bg-gray-50">
                  <td>{new Date(h.created_at).toLocaleString()}</td>
                  <td className="capitalize">{h.type}</td>
                  <td className={h.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                    {h.amount > 0 ? '+' : ''}{h.amount}
                  </td>
                  <td>{h.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

Coins.auth = true;
export default Coins;
