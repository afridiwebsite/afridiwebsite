import fetch from 'node-fetch';

/**
 * Dispatch an order to a per-package auto-bot endpoint.
 *
 * The bot URL is now sourced from the TopupPackage row's `bot_url` column
 * rather than the AutoServer table — admins configure it per-package on the
 * Add/Edit Package form. If the package has no bot_url set we treat it as
 * "no auto-bot for this package" and return false so the caller returns
 * the voucher to the pool and leaves the order pending.
 */
const autoOrder = async (
  order_id: number,
  player_id: string,
  package_uc: number,
  unipin: string,
  bot_url: string,
  dtype: string = '80',
) => {
  const url = String(bot_url || '').trim();
  if (!url) {
    console.warn('[autoOrder] no bot_url configured for this package — skipping bot dispatch');
    return false;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerid: player_id,
        pacakge: package_uc,
        code: unipin,
        orderid: order_id,
        url: `${process.env.API_URL || 'https://api.rrrbazar.com'}/api/v1/check_order?type=${dtype}`,
      }),
    });

    console.log('[autoOrder] bot response:', response, response.status, response.statusText, JSON.stringify({
        playerid: player_id,
        pacakge: package_uc,
        code: unipin,
        orderid: order_id,
        url: `${process.env.API_URL || 'https://api.rrrbazar.com'}/api/v1/check_order?type=${dtype}`,
      }),);

    if (!response.ok) {
      console.error('[autoOrder] non-ok status from bot:', response.status, response.statusText);
      return false;
    }

    // Return the URL we hit so callers can stash it on order.ingamepassword
    // for traceability (matches the previous helper's contract).
    return url;
  } catch (error) {
    console.error('[autoOrder] error dispatching to bot:', error);
    return false;
  }
};

export default autoOrder;
