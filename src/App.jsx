import React, { useEffect, useState, useCallback } from 'react';
import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction,
  getNetwork,
} from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';
import './App.css';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const TESTNET_EXPLORER = 'https://testnet.stellarchain.io/transactions';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [balance, setBalance] = useState(null);
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [freighterInstalled, setFreighterInstalled] = useState(true);
  const [networkCorrect, setNetworkCorrect] = useState(true);

  const checkConnection = useCallback(async () => {
    try {
      const connected = await isConnected();
      if (!connected?.isConnected) {
        setFreighterInstalled(false);
        setWalletConnected(false);
        return;
      }
      setFreighterInstalled(true);
      const addressResponse = await getAddress();
      if (addressResponse?.address) {
        setPublicKey(addressResponse.address);
        setWalletConnected(true);
        await fetchBalance(addressResponse.address);
        await checkNetwork();
      }
    } catch (e) {
      console.error('Connection check failed:', e);
      setFreighterInstalled(false);
      setWalletConnected(false);
    }
  }, []);

  const checkNetwork = async () => {
    try {
      const network = await getNetwork();
      setNetworkCorrect(network?.network === 'TESTNET');
    } catch (e) {
      console.error('Network check failed:', e);
    }
  };

  const fetchBalance = async (pk) => {
    if (!pk) return;
    setBalance(null);
    try {
      const account = await server.loadAccount(pk);
      const xlm = account.balances.find((b) => b.asset_type === 'native');
      setBalance(xlm ? parseFloat(xlm.balance) : 0);
    } catch (e) {
      if (e.response?.status === 404) {
        setBalance(0);
      } else {
        console.error('Balance fetch failed:', e);
        setBalance(null);
      }
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);
    setError('');
    try {
      const connected = await isConnected();
      if (!connected?.isConnected) {
        setFreighterInstalled(false);
        setError('Freighter wallet not detected. Please install the Freighter extension.');
        return;
      }
      const network = await getNetwork();
      if (network?.network !== 'TESTNET') {
        setError('Please switch to Testnet network in your Freighter wallet settings.');
        setNetworkCorrect(false);
        setIsLoading(false);
        return;
      }
      const addressResponse = await getAddress();
      if (addressResponse?.error) {
        throw new Error(addressResponse.error);
      }
      setPublicKey(addressResponse.address);
      setWalletConnected(true);
      setNetworkCorrect(true);
      await fetchBalance(addressResponse.address);
    } catch (e) {
      console.error('Connect failed:', e);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setPublicKey('');
    setBalance(null);
    setDestination('');
    setAmount('');
    setTxStatus(null);
    setTxHash('');
    setError('');
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setTxStatus({ type: 'info', message: 'Address copied to clipboard!' });
      setTimeout(() => setTxStatus(null), 2000);
    }
  };

  const fundAccount = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${publicKey}`
      );
      if (response.ok) {
        await fetchBalance(publicKey);
        setTxStatus({ type: 'success', message: 'Account funded with 10,000 XLM!' });
      } else {
        throw new Error('Failed to fund account');
      }
    } catch (e) {
      setError('Failed to fund account. It may already be funded.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateAddress = (addr) => {
    try {
      return StellarSdk.StrKey.isValidEd25519PublicKey(addr);
    } catch {
      return false;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setTxStatus(null);
    setTxHash('');
    setError('');

    if (!destination) {
      setError('Please enter a destination address.');
      return;
    }
    if (!validateAddress(destination)) {
      setError('Invalid Stellar address format.');
      return;
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (balance === 0) {
      setError('Insufficient balance.');
      return;
    }
    if (parseFloat(amount) > balance - 1) {
      setError(`Insufficient balance. You need at least 1 XLM for network reserve.`);
      return;
    }

    setIsLoading(true);
    try {
      setTxStatus({ type: 'loading', message: 'Getting network from wallet...' });

      const networkInfo = await getNetwork();
      
      if (networkInfo.error) {
        throw new Error('Failed to get network info: ' + (networkInfo.error.message || 'Unknown error'));
      }

      const walletNetworkPassphrase = networkInfo.networkPassphrase;

      console.log('Wallet passphrase:', walletNetworkPassphrase);

      setTxStatus({ type: 'loading', message: 'Building transaction...' });

      const sourceAccount = await server.loadAccount(publicKey);
      const fee = await server.fetchBaseFee();

      console.log('Source account key:', sourceAccount.accountId());

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: fee.toString(),
        networkPassphrase: walletNetworkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destination,
            asset: StellarSdk.Asset.native(),
            amount: parseFloat(amount).toFixed(7),
          })
        )
        .setTimeout(180)
        .build();

      const unsignedXdr = transaction.toXDR();
      console.log('Unsigned XDR length:', unsignedXdr.length);

      setTxStatus({ type: 'loading', message: 'Sign transaction in Freighter...' });

      const signedTxResponse = await signTransaction(unsignedXdr, {
        networkPassphrase: walletNetworkPassphrase,
      });

      if (signedTxResponse.error) {
        const errorMsg = signedTxResponse.error.message || 'Signing failed';
        throw new Error(errorMsg);
      }

      const signedTxXdr = signedTxResponse.signedTxXdr;
      const signerAddress = signedTxResponse.signerAddress;

      console.log('App publicKey:', publicKey);
      console.log('Freighter signerAddress:', signerAddress);

      if (!signedTxXdr || typeof signedTxXdr !== 'string') {
        throw new Error('Invalid signed transaction received');
      }

      if (signerAddress && signerAddress !== publicKey) {
        console.log('Address mismatch! Using signer address as source.');
        setTxStatus({ type: 'loading', message: 'Rebuilding transaction with correct source...' });

        const newSourceAccount = await server.loadAccount(signerAddress);
        const newFee = await server.fetchBaseFee();

        const newTransaction = new StellarSdk.TransactionBuilder(newSourceAccount, {
          fee: newFee.toString(),
          networkPassphrase: walletNetworkPassphrase,
        })
          .addOperation(
            StellarSdk.Operation.payment({
              destination: destination,
              asset: StellarSdk.Asset.native(),
              amount: parseFloat(amount).toFixed(7),
            })
          )
          .setTimeout(180)
          .build();

        setTxStatus({ type: 'loading', message: 'Sign transaction in Freighter...' });

        const newSignedTxResponse = await signTransaction(newTransaction.toXDR(), {
          networkPassphrase: walletNetworkPassphrase,
        });

        if (newSignedTxResponse.error) {
          throw new Error(newSignedTxResponse.error.message || 'Signing failed');
        }

        const newSignedTxXdr = newSignedTxResponse.signedTxXdr;

        if (!newSignedTxXdr) {
          throw new Error('Failed to get signed transaction');
        }

        setTxStatus({ type: 'loading', message: 'Broadcasting to Stellar Testnet...' });

        const signedTransaction = new StellarSdk.Transaction(
          newSignedTxXdr,
          walletNetworkPassphrase
        );

        const result = await server.submitTransaction(signedTransaction);

        setTxHash(result.hash);
        setTxStatus({
          type: 'success',
          message: `Successfully sent ${parseFloat(amount).toFixed(7)} XLM!`,
        });
        setDestination('');
        setAmount('');
        await fetchBalance(signerAddress);
        return;
      }

      console.log('Signed XDR length:', signedTxXdr.length);

      setTxStatus({ type: 'loading', message: 'Broadcasting to Stellar Testnet...' });

      const signedTransaction = new StellarSdk.Transaction(
        signedTxXdr,
        walletNetworkPassphrase
      );

      console.log('Signed tx source:', signedTransaction.source);

      const result = await server.submitTransaction(signedTransaction);

      setTxHash(result.hash);
      setTxStatus({
        type: 'success',
        message: `Successfully sent ${parseFloat(amount).toFixed(7)} XLM!`,
      });
      setDestination('');
      setAmount('');
      await fetchBalance(publicKey);
    } catch (err) {
      console.error('Transaction failed:', err);
      let errorMessage = err.message || 'Transaction failed.';
      
      setError(errorMessage);
      setTxStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return (
    <div className="app-container">
      <div className="background-effects">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className="main-card">
        <div className="header-section">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1>Stellar Payment</h1>
          <p className="subtitle">Send XLM on Testnet</p>
        </div>

        {!freighterInstalled && (
          <div className="alert alert-warning">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Freighter wallet not detected</strong>
              <p>Please install the Freighter extension from your browser's extension store.</p>
            </div>
          </div>
        )}

        {!walletConnected ? (
          <div className="connect-section">
            <div className="connect-icon">🔗</div>
            <p>Connect your Freighter wallet to send XLM on the Stellar Testnet.</p>
            <button
              className="btn btn-primary"
              onClick={connectWallet}
              disabled={!freighterInstalled || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-small"></span>
                  Connecting...
                </>
              ) : (
                'Connect Wallet'
              )}
            </button>
          </div>
        ) : (
          <div className="wallet-section">
            <div className="wallet-info-card">
              <div className="info-row">
                <span className="info-label">Address</span>
                <div className="info-value-container">
                  <span className="info-value">{publicKey.slice(0, 8)}...{publicKey.slice(-6)}</span>
                  <button className="copy-btn" onClick={copyAddress} title="Copy address">
                    📋
                  </button>
                </div>
              </div>
              <div className="info-row">
                <span className="info-label">Balance</span>
                <span className="balance-value">
                  {balance === null ? (
                    <span className="loading-dots">Loading...</span>
                  ) : (
                    `${balance.toFixed(7)} XLM`
                  )}
                </span>
              </div>
              {!networkCorrect && (
                <div className="network-warning">
                  <span>⚠️ Wrong network. Please switch to Testnet in Freighter.</span>
                </div>
              )}
            </div>

            {balance === 0 && (
              <div className="alert alert-info">
                <span className="alert-icon">💡</span>
                <div>
                  <strong>Account not funded</strong>
                  <p>Fund your account with test XLM to start sending transactions.</p>
                  <button className="btn btn-small btn-primary" onClick={fundAccount} disabled={isLoading}>
                    {isLoading ? 'Funding...' : 'Fund Account (10,000 XLM)'}
                  </button>
                </div>
              </div>
            )}

            <form className="send-form" onSubmit={handleSend}>
              <h2 className="section-title">Send XLM</h2>

              <div className="form-group">
                <label>Recipient Address</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.trim())}
                  placeholder="G... (56-character Stellar address)"
                  className="input-field"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label>Amount (XLM)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0000000"
                  min="0.0000001"
                  step="0.0000001"
                  className="input-field"
                  disabled={isLoading}
                />
                {balance !== null && (
                  <span className="available-hint">
                    Available: {balance.toFixed(7)} XLM (1 XLM reserved)
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || balance === null || balance === 0}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    Processing...
                  </>
                ) : (
                  'Send XLM'
                )}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={disconnectWallet}
                disabled={isLoading}
              >
                Disconnect Wallet
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="status-box status-error">
            <span>❌</span>
            <span>{error}</span>
          </div>
        )}

        {txStatus && txStatus.type === 'loading' && (
          <div className="status-box status-loading">
            <span className="spinner"></span>
            <span>{txStatus.message}</span>
          </div>
        )}

        {txStatus && txStatus.type === 'success' && (
          <div className="status-box status-success">
            <span>✅</span>
            <span>{txStatus.message}</span>
          </div>
        )}

        {txStatus && txStatus.type === 'info' && (
          <div className="status-box status-info">
            <span>ℹ️</span>
            <span>{txStatus.message}</span>
          </div>
        )}

        {txHash && (
          <div className="tx-details">
            <div className="tx-hash">
              <span className="tx-label">Transaction Hash:</span>
              <span className="tx-value">{txHash.slice(0, 20)}...{txHash.slice(-10)}</span>
            </div>
            <a
              href={`${TESTNET_EXPLORER}/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-explorer"
            >
              View on StellarChain.io ↗
            </a>
          </div>
        )}

        <div className="footer">
          <div className="network-indicator">
            <span className="net-dot"></span>
            Network: Stellar Testnet
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
