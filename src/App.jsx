import { useState, useEffect, useCallback } from 'react'
import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api'
import {
  TransactionBuilder,
  Networks,
  Asset,
  Account,
  Operation
} from 'stellar-sdk'

const STELLAR_TESTNET = {
  networkPassphrase: Networks.TESTNET,
  horizonUrl: 'https://horizon-testnet.stellar.org'
}

function App() {
  const [publicKey, setPublicKey] = useState('')
  const [balance, setBalance] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [txHash, setTxHash] = useState('')
  const [txDetails, setTxDetails] = useState(null)

  const fetchBalance = useCallback(async (pubKey) => {
    try {
      const response = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${pubKey}`
      )
      if (!response.ok) {
        setBalance('0')
        return
      }
      const data = await response.json()
      if (!data.balances) {
        setBalance('0')
        return
      }
      const xlmBalance = data.balances.find(b => b.asset_type === 'native')
      setBalance(xlmBalance ? parseFloat(xlmBalance.balance).toFixed(2) : '0')
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance('0')
    }
  }, [])

  const connectWallet = useCallback(async () => {
    setIsLoading(true)
    setStatus({ type: '', message: '' })
    try {
      const connected = await isConnected()
      if (!connected.isConnected) {
        setStatus({ type: 'error', message: 'Freighter wallet not installed' })
        setIsLoading(false)
        return
      }

      const addressObj = await requestAccess()
      if (addressObj.error) {
        throw new Error(addressObj.error.message)
      }

      const pubKey = addressObj.address
      if (pubKey) {
        setPublicKey(pubKey)
        await fetchBalance(pubKey)
        setStatus({ type: 'success', message: 'Wallet connected!' })
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      setStatus({ type: 'error', message: `Failed to connect: ${error.message}` })
    }
    setIsLoading(false)
  }, [])

  const disconnectWallet = useCallback(async () => {
    setPublicKey('')
    setBalance(null)
    setRecipient('')
    setAmount('')
    setStatus({ type: 'success', message: 'Wallet disconnected' })
    setTxHash('')
    setTxDetails(null)
  }, [])

  const sendTransaction = useCallback(async () => {
    if (!publicKey || !recipient || !amount) {
      setStatus({ type: 'error', message: 'Please fill all fields' })
      return
    }

    setIsLoading(true)
    setStatus({ type: '', message: '' })
    setTxHash('')

    try {
      const response = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${publicKey}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch account')
      }
      const accountData = await response.json()

      const account = new Account(publicKey, String(accountData.sequence))

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: STELLAR_TESTNET.networkPassphrase
      })
        .addOperation(Operation.payment({
          destination: recipient,
          asset: Asset.native(),
          amount: amount
        }))
        .setTimeout(30)
        .build()

      const txEnvelope = transaction.toXDR()

      const signedTx = await signTransaction(txEnvelope, {
        networkPassphrase: STELLAR_TESTNET.networkPassphrase
      })
      console.log('Signed transaction:', signedTx)

      if (!signedTx) {
        throw new Error('No signed transaction returned')
      }

      if (signedTx.error) {
        if (signedTx.error.code === -4 || signedTx.error.message?.includes('rejected')) {
          throw new Error('Transaction signing rejected. Please approve the transaction in your wallet.')
        }
        throw new Error(`Signing failed: ${signedTx.error.message || 'Unknown error'}`)
      }

      let txToSubmit = ''
      if (typeof signedTx === 'string') {
        txToSubmit = signedTx
      } else if (signedTx && signedTx.signedTxXdr) {
        txToSubmit = signedTx.signedTxXdr
      } else if (signedTx && signedTx.signedTx) {
        txToSubmit = signedTx.signedTx
      } else if (signedTx && signedTx.result) {
        txToSubmit = signedTx.result
      } else {
        console.error('Unexpected signing format:', signedTx)
        throw new Error('Unexpected signing result format: ' + JSON.stringify(signedTx))
      }

      if (!txToSubmit) {
        throw new Error('Empty signed transaction')
      }

      const submitResponse = await fetch(
        `${STELLAR_TESTNET.horizonUrl}/transactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `tx=${encodeURIComponent(txToSubmit)}`
        }
      )

      const result = await submitResponse.json()
      console.log('Submit result:', result)

      if (!submitResponse.ok) {
        const errorMsg = result.extras?.envelope_xdr 
          ? `Invalid transaction: ${result.extras.result_codes?.transaction || 'Unknown error'}`
          : result.detail || result.error || `HTTP ${submitResponse.status}: Transaction failed`
        throw new Error(errorMsg)
      }

      if (!result.hash) {
        throw new Error('No transaction hash returned')
      }

      const verifyRes = await fetch(`${STELLAR_TESTNET.horizonUrl}/transactions/${result.hash}`)
      if (!verifyRes.ok) {
        throw new Error('Transaction submitted but could not be verified')
      }
      const verifiedTx = await verifyRes.json()
      console.log('Transaction verified:', verifiedTx)

      setTxHash(result.hash)
      setStatus({ type: 'success', message: 'Transaction successful!' })
      setTxDetails(verifiedTx)
      await fetchBalance(publicKey)
      setRecipient('')
      setAmount('')
    } catch (error) {
      console.error('Transaction error:', error)
      const errorMsg = error?.message || error?.toString() || 'Unknown error'
      setStatus({ type: 'error', message: `Transaction failed: ${errorMsg}` })
    }
    setIsLoading(false)
  }, [publicKey, recipient, amount, fetchBalance])

  useEffect(() => {
    let mounted = true
    const checkConnection = async () => {
      try {
        const connected = await isConnected()
        if (mounted && connected.isConnected) {
          const addressObj = await getAddress()
          if (mounted && addressObj.address) {
            setPublicKey(addressObj.address)
            await fetchBalance(addressObj.address)
          }
        }
      } catch (e) {
        console.log('No wallet connected')
      }
    }
    checkConnection()
    return () => { mounted = false }
  }, [fetchBalance])

  return (
    <div className="container">
      <h1>Stellar Payment dApp</h1>
      <p className="subtitle">Send XLM on Testnet</p>

      <div className="card">
        {publicKey ? (
          <>
            <div className="wallet-info">
              <div className="info-row">
                <span className="label">Address:</span>
                <span className="value address">{publicKey.slice(0, 8)}...{publicKey.slice(-8)}</span>
              </div>
              <div className="info-row">
                <span className="label">Balance:</span>
                <span className="value balance">{balance !== null ? `${balance} XLM` : 'Loading...'}</span>
              </div>
            </div>

            <div className="send-form">
              <h2>Send XLM</h2>
              <input
                type="text"
                placeholder="Recipient Address (G...)"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <input
                type="number"
                placeholder="Amount (XLM)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.0001"
                min="0.0001"
              />
              <button 
                onClick={sendTransaction}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Send XLM'}
              </button>
            </div>

            <button className="disconnect-btn" onClick={disconnectWallet}>
              Disconnect Wallet
            </button>
          </>
        ) : (
          <button className="connect-btn" onClick={connectWallet} disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect Freighter Wallet'}
          </button>
        )}

        {status.message && (
          <div className={`status ${status.type}`}>
            {status.message}
            
            {txDetails ? (
              <div className="tx-details">
                <p><strong>Hash:</strong> {txDetails.id?.slice(0, 20)}...</p>
                <p><strong>Fee:</strong> {txDetails.fee_charged} stroops</p>
                <p><strong>Operation Count:</strong> {txDetails.operation_count}</p>
                <p><strong>Created At:</strong> {new Date(txDetails.created_at).toLocaleString()}</p>
              </div>
            ) : txHash ? (
              <div className="tx-details">
                <p><strong>Transaction Hash:</strong></p>
                <p className="tx-hash">{txHash}</p>
              </div>
            ) : null}
            
            {txHash && (
              <button 
                onClick={() => window.open(`https://testnet.stellarchain.io/transactions/${txHash}`, '_blank')}
                className="tx-link"
              >
                View on StellarChain Explorer
              </button>
            )}
          </div>
        )}
      </div>

      <p className="network">Network: Stellar Testnet</p>
    </div>
  )
}

export default App