import React, { useEffect, useState } from 'react';
import { isConnected, getPublicKey, connect, disconnect, signTransaction } from '@stellar/freighter-api';
import { Server } from 'stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [balance, setBalance] = useState('');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const connected = await isConnected();
      setWalletConnected(connected);
      if (connected) {
        const pk = await getPublicKey();
        setPublicKey(pk);
        fetchBalance(pk);
      }
    } catch (e) {
      setWalletConnected(false);
    }
  }

  async function fetchBalance(pk) {
    try {
      const server = new Server(HORIZON_URL);
      const account = await server.loadAccount(pk);
      const xlm = account.balances.find(b => b.asset_type === 'native');
      setBalance(xlm ? xlm.balance : '0');
    } catch (e) {
      setBalance('0');
    }
  }

  async function handleConnect() {
    try {
      await connect();
      checkConnection();
    } catch (e) {
      setError('Failed to connect wallet');
    }
  }

  async function handleDisconnect() {
    disconnect();
    setWalletConnected(false);
    setPublicKey('');
    setBalance('');
    setTxStatus('');
    setTxHash('');
    setError('');
  }

  async function handleSend(e) {
    e.preventDefault();
    setTxStatus('');
    setTxHash('');
    setError('');
    try {
      const server = new Server(HORIZON_URL);
      const account = await server.loadAccount(publicKey);
      const fee = await server.fetchBaseFee();
      const tx = new server.constructor.TransactionBuilder(account, {
        fee,
        networkPassphrase: 'Test SDF Network ; September 2015',
      })
        .addOperation(server.constructor.Operation.payment({
          destination,
          asset: server.constructor.Asset.native(),
          amount: amount.toString(),
        }))
        .setTimeout(30)
        .build();
      const signedTx = await signTransaction(tx.toXDR(), 'Test SDF Network ; September 2015');
      const result = await server.submitTransaction(server.constructor.TransactionBuilder.fromXDR(signedTx, 'Test SDF Network ; September 2015'));
      setTxStatus('Success!');
      setTxHash(result.hash);
      fetchBalance(publicKey);
    } catch (err) {
      setTxStatus('Failed');
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Stellar Payment dApp</h2>
      {!walletConnected ? (
        <button onClick={handleConnect}>Connect Freighter Wallet</button>
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <strong>Wallet:</strong> {publicKey}
            <button style={{ marginLeft: 10 }} onClick={handleDisconnect}>Disconnect</button>
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>Balance:</strong> {balance} XLM
          </div>
          <form onSubmit={handleSend}>
            <div>
              <label>Destination Address:</label>
              <input value={destination} onChange={e => setDestination(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div>
              <label>Amount (XLM):</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="0.0000001" step="0.0000001" style={{ width: '100%' }} />
            </div>
            <button type="submit" style={{ marginTop: 10 }}>Send XLM</button>
          </form>
          {txStatus && (
            <div style={{ marginTop: 10 }}>
              <strong>Status:</strong> {txStatus}
              {txHash && <div>Transaction Hash: {txHash}</div>}
              {error && <div style={{ color: 'red' }}>{error}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
