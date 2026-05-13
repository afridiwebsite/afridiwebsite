import fetch from 'node-fetch';

const fastPay = async (requestData: any) => {
  try {    
    const resp = await fetch(process.env.UDDOKTAPAY_CHECKOUT_URL || "https://pay.rrrbazar.com/api/checkout", {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": process.env.UDDOKTAPAY_API_KEY || "18b2ca74b5fe2f63d8293687d94fde987925c98f"
      },
      body: JSON.stringify(requestData)
    });

    const data = await resp.json();
    return data;

  } catch (error) {
    return error;
  }
};

export default fastPay;
