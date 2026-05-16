import fetch from 'node-fetch';

// Redact the api key so we never log the full secret. Other fields are kept
// as-is so the actual payload (metadata, urls, amount) is visible in logs.
const redactKey = (v?: string) => {
  if (!v) return '<unset>';
  if (v.length <= 8) return '***';
  return v.slice(0, 4) + '…' + v.slice(-4);
};

const fastPay = async (requestData: any) => {
  const url =
    process.env.UDDOKTAPAY_CHECKOUT_URL || 'https://pay.rrrbazar.com/api/checkout';
  const apiKey =
    process.env.UDDOKTAPAY_API_KEY ||
    '18b2ca74b5fe2f63d8293687d94fde987925c98f';

  console.log('[fastPay] →', url);
  console.log('[fastPay] api key:', redactKey(apiKey));
  console.log('[fastPay] webhook_url in request:', requestData?.webhook_url);
  console.log('[fastPay] redirect_url in request:', requestData?.redirect_url);
  console.log('[fastPay] metadata in request:', JSON.stringify(requestData?.metadata));

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'RT-UDDOKTAPAY-API-KEY': apiKey,
      },
      body: JSON.stringify(requestData),
    });

    const raw = await resp.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { _nonJsonBody: raw };
    }

    console.log('[fastPay] ← status:', resp.status, resp.statusText);
    console.log('[fastPay] ← body:', raw);

    if (!resp.ok) {
      // Surface non-2xx as an error instead of silently returning it as if it
      // were a checkout response. The caller can then send a real error back
      // to the client rather than the user thinking the order succeeded.
      const err: any = new Error(
        `UddoktaPay checkout failed: HTTP ${resp.status} ${resp.statusText}`,
      );
      err.status = resp.status;
      err.body = data;
      throw err;
    }

    return data;
  } catch (error: any) {
    console.error(
      '[fastPay] error:',
      error?.message || error,
      error?.body || '',
    );
    // Re-throw so the controller can catch and respond with a real error.
    throw error;
  }
};

export default fastPay;
