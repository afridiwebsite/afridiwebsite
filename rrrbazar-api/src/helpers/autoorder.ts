import fetch from 'node-fetch';

/**
 * Dispatch an order to a per-package auto-bot endpoint.
 *
 * The bot URL is now sourced from the TopupPackage row's `bot_url` column
 * rather than the AutoServer table — admins configure it per-package on the
 * Add/Edit Package form. If the package has no bot_url set we treat it as
 * "no auto-bot for this package" and return false so the caller returns
 * the voucher to the pool and leaves the order pending.
 *
 * Payload shape (what the bot sees):
 *   playerid : the entered Player ID
 *   pacakge  : the package name (admin-set human label, e.g. "60 UC")
 *   code     : the redemption code — either the emitted voucher (`unipin`)
 *              OR the admin-configured shell string when `shellOverride`
 *              is non-empty (package row had `is_shell = 1`)
 *   orderid  : our order id
 *   url      : the callback URL we want the bot to POST back to
 */
const autoOrder = async (
  order_id: number,
  player_id: string,
  package_uc: number,
  unipin: string,
  bot_url: string,
  package_name: string = '',
  shellOverride: string = '',
  dtype: string = '80',
) => {
  // When the package is a shell-style delivery, the admin-configured shell
  // string replaces the voucher code in the `code` field. The voucher (if
  // any) is still tracked on our side via `unipin`, but the bot expects the
  // shell.
  const codeForBot = shellOverride && shellOverride.length > 0
    ? shellOverride
    : unipin;

  console.log('[autoOrder] Starting dispatch:', {
    order_id,
    player_id,
    package_uc,
    package_name,
    code_kind: shellOverride ? 'shell' : 'voucher',
    code_masked: codeForBot ? `${String(codeForBot).substring(0, 4)}...` : 'empty',
    bot_url,
    dtype,
  });

  const url = String(bot_url || '').trim();
  if (!url) {
    console.warn('[autoOrder] no bot_url configured for this package — skipping bot dispatch');
    return false;
  }

  const callbackUrl = `${process.env.API_URL || 'https://api.rrrbazar.com'}/api/v1/check_order?type=${dtype}`;
  const requestBody = {
    playerid: player_id,
    pacakge: package_name || '',
    code: codeForBot,
    orderid: order_id,
    url: callbackUrl,
  };

  console.log('[autoOrder] Sending request to:', url);
  console.log('[autoOrder] Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[autoOrder] Raw response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    let responseData: any;
    const contentType = response.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    } catch (parseError) {
      console.error('[autoOrder] Failed to parse response body:', parseError);
      responseData = '(unparseable)';
    }

    console.log('[autoOrder] Bot response body:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('[autoOrder] Bot returned non-ok status:', response.status, response.statusText);
      return false;
    }

    console.log('[autoOrder] Dispatch successful for order:', order_id);
    // Return the URL we hit so callers can stash it on order.ingamepassword
    // for traceability (matches the previous helper's contract).
    return url;
  } catch (error) {
    console.error('[autoOrder] Critical error dispatching to bot:', error);
    return false;
  }
};

export default autoOrder;
