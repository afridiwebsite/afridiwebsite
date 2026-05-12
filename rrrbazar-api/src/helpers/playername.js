import fetch from 'node-fetch';

const playerName = async (playerid) => {
  try {    
   //const resp = await fetch(`https://bakuzone.com/game-checker/freefire/${playerid}`, {
   //  method: 'get'
   // });

    //const data = await resp.json();
    //return data;

   const response = await fetch(`https://api.neferbyte.com/game-id-checker/ff-global/${playerid}`, {
		method: 'GET',
		headers: {
		  'Content-Type': 'application/json', 
		  'x-api-key': 'aeb1e0b76be5d2630c38a825e9fba2fb', 
		},
	  });
	  //console.log(response);
	  //if (!response.ok) {
		//throw new Error(HTTP error! status: ${response.status});
	  //}
	return response;
  } catch (error) {
    return error;
  }
};

module.exports = playerName;
