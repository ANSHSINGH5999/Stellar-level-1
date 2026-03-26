import StellarSdk from 'stellar-sdk';

const STELLAR_TESTNET = {
  networkPassphrase: StellarSdk.Networks.TESTNET,
  horizonUrl: 'https://horizon-testnet.stellar.org'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signedTxXdr } = req.body;

    if (!signedTxXdr) {
      return res.status(400).json({ error: 'Missing signed transaction XDR' });
    }

    const server = new StellarSdk.Server(STELLAR_TESTNET.horizonUrl);
    
    let transaction;
    try {
      transaction = new StellarSdk.Transaction(signedTxXdr, STELLAR_TESTNET.networkPassphrase);
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
