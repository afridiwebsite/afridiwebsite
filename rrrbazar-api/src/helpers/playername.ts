import fetch from 'node-fetch';

const playerName = async (playerid: string) => {
  try {
    const resp = await fetch(`${process.env.API_URL || "https://api.rrrbazar.com"}/api/v1/get-player-name/${playerid}`);
    const data = await resp.json();
    return data;
  } catch (error) {
    return error;
  }
};

export default playerName;
