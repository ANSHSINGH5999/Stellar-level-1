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

    if (typeof signedTxXdr !== 'string' || signedTxXdr.length < 10) {
      return res.status(400).json({ error: 'Invalid transaction XDR format' });
    }

    const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
    
    let transaction;
    try {
      transaction = new StellarSdk.Transaction(signedTxXdr, StellarSdk.Networks.TESTNET);
    } catch (e) {
      console.error('Transaction parse error:', e);
      return res.status(400).json({ error: 'Invalid transaction XDR: ' + e.message });
    }

    const result = await server.submitTransaction(transaction);
    
    return res.status(200).json({
      success: true,
      hash: result.hash,
      ledger: result.ledger,
      created_at: result.created_at
    });
  } catch (error) {
    console.error('Transaction submission error:', error);
    
    let errorMsg = error.toString();
    let errorCode = 400;

    if (error.response?.data) {
      const data = error.response.data;
      if (data.extras?.result_codes?.transaction) {
        const txCode = data.extras.result_codes.transaction;
        if (txCode === 'tx_bad_auth') {
          errorMsg = 'Transaction authentication failed. The signature may be invalid.';
        } else if (txCode === 'tx_insufficient_balance') {
          errorMsg = 'Insufficient balance to complete the transaction.';
        } else if (txCode === 'tx_too_late') {
          errorMsg = 'Transaction has expired. Please try again.';
        } else if (txCode === 'op_no_destination') {
          errorMsg = 'Destination account does not exist.';
        } else {
          errorMsg = `Transaction failed: ${txCode}`;
        }
      } else if (data.detail) {
        errorMsg = data.detail;
      }
    } else if (error.message?.includes('timeout')) {
      errorMsg = 'Request timed out. Please try again.';
    }

    return res.status(errorCode).json({ error: errorMsg });
  }
}
