import fetch from 'node-fetch';

const smsHelper = async (number: string, text: string = '') => {
  let success: boolean;
  try {
    console.log(`https://api.sms.net.bd/sendsms?api_key=${process.env.SMS_HASH_TOKEN}&msg=${text}&to=${number}`);
    await fetch(
      `https://api.sms.net.bd/sendsms?api_key=${process.env.SMS_HASH_TOKEN}&msg=${text}&to=${number}`
    );
    success = true;
    return success;
  } catch (error) {
    success = false;
    return success;
  }
};

export default smsHelper;
