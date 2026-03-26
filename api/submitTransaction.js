export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signedTxXdr } = req.body;

    if (!signedTxXdr) {
      return res.status(400).json({ error: 'Missing signed transaction XDR' });
    }

    const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
    
    let transaction;
    try {
      transaction = new StellarSdk.Transaction(signedTxXdr, StellarSdk.Networks.TESTNET);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid transaction XDR' });
    }

    const result = await server.submitTransaction(transaction);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Transaction submission error:', error);
    
    const errorMsg = error?.response?.data || error.toString();
    return res.status(400).json({ error: errorMsg });
  }
}
