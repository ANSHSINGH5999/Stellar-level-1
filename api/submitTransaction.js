// API endpoint to submit a Stellar transaction using stellar-sdk
import { Server, Keypair, TransactionBuilder, Networks, Operation, Asset } from 'stellar-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { senderSecret, destination, amount } = req.body;
  if (!senderSecret || !destination || !amount) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const server = new Server('https://horizon-testnet.stellar.org');
    const sourceKeypair = Keypair.fromSecret(senderSecret);
    const account = await server.loadAccount(sourceKeypair.publicKey());

    const transaction = new TransactionBuilder(account, {
      fee: await server.fetchBaseFee(),
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(Operation.payment({
        destination,
        asset: Asset.native(),
        amount: amount.toString()
      }))
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);
    const txResult = await server.submitTransaction(transaction);
    res.status(200).json({ hash: txResult.hash, result: txResult });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
