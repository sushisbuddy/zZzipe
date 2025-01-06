async function sendSwapRequest(tokenAddress, amount, side = 'buy') {
  try {
    const response = await fetch('https://extension.bloombot.app/swap', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json',
        'origin': 'https://neo.bullx.io',
        'priority': 'u=1, i',
        'referer': 'https://neo.bullx.io/',
        'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Opera GX";v="114"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/114.0.0.0'
      },
      body: JSON.stringify({
        addr: tokenAddress,
        isPool: false,
        amt: amount.toString(),
        auth: "",
        side: side
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send swap request');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending swap request:', error);
    return { success: false, error: error.message };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendSwapRequest') {
    sendSwapRequest(request.tokenAddress, request.amount, request.side)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});