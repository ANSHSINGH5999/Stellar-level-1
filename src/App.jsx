import { useState, useEffect, useCallback } from 'react'
import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction,
  getNetwork,
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
  network: 'TESTNET',
  horizonUrl: 'https://horizon-testnet.stellar.org'
}

const wrapFreighterCall = async (fn, errorMsg, retries = 3) => {
  let lastError = null
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await fn()
      if (result && result.error) {
        throw new Error(result.error.message || result.error.toString())
      }
      return result
    } catch (e) {
      lastError = e
      const isRetryable = e.message?.includes('message port closed') || 
                          e.message?.includes('async response') ||
                          e.message?.includes('Extension context invalidated') ||
                          e.message?.includes('freighter') ||
                          e.message?.includes('wallet')
      if (isRetryable && i < retries) {
        console.warn(`Freighter error, retrying (${i + 1}/${retries})...`, e.message)
        await new Promise(r => setTimeout(r, 1000 * (i + 1)))
      } else {
        throw new Error(errorMsg || lastError.message)
      }
    }
  }
  throw new Error(errorMsg || lastError?.message)
}

const isValidStellarAddress = (address) => {
  return /^G[A-Z0-9]{55}$/.test(address)
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
  const [freighterAvailable, setFreighterAvailable] = useState(null)

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
      const connected = await wrapFreighterCall(
        () => isConnected(),
        'Failed to check wallet connection'
      )
      if (!connected.isConnected) {
        setStatus({ type: 'error', message: 'Freighter wallet not installed or locked' })
        setFreighterAvailable(false)
        setIsLoading(false)
        return
      }

      const networkDetails = await wrapFreighterCall(
        () => getNetwork(),
        'Failed to get network'
      )
      
      if (networkDetails.error) {
        throw new Error('Could not get network. Please unlock your wallet.')
      }
      
      if (networkDetails.network !== STELLAR_TESTNET.network) {
        setStatus({ 
          type: 'error', 
          message: `Wrong network! Switch Freighter to TESTNET. Current: ${networkDetails.network}` 
        })
        setIsLoading(false)
        return
      }

      const addressObj = await wrapFreighterCall(
        () => requestAccess(),
        'Failed to connect to wallet'
      )
      if (addressObj.error) {
        throw new Error(addressObj.error.message)
      }

      const pubKey = addressObj.address
      if (pubKey) {
        setPublicKey(pubKey)
        await fetchBalance(pubKey)
        setStatus({ type: 'success', message: 'Wallet connected!' })
        setFreighterAvailable(true)
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      setFreighterAvailable(false)
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

    if (!isValidStellarAddress(recipient)) {
      setStatus({ type: 'error', message: 'Invalid Stellar address. Must start with G and be 56 characters.' })
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setStatus({ type: 'error', message: 'Invalid amount. Must be greater than 0.' })
      return
    }

    setIsLoading(true)
    setStatus({ type: '', message: '' })
    setTxHash('')

    try {
      setStatus({ type: '', message: 'Fetching account info...' })
      
      const response = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${publicKey}`
      )
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Account not found on Stellar testnet. Make sure your wallet is funded.')
        }
        throw new Error(`Failed to fetch account: HTTP ${response.status}`)
      }
      const accountData = await response.json()

      if (!accountData.sequence) {
        throw new Error('Invalid account data received')
      }

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

      const signedTx = await wrapFreighterCall(
        () => signTransaction(txEnvelope, {
          networkPassphrase: STELLAR_TESTNET.networkPassphrase
        }),
        'Failed to sign transaction'
      )

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
        throw new Error('Unexpected signing result format')
      }

      if (!txToSubmit) {
        throw new Error('Empty signed transaction')
      }

      const submitResponse = await fetch(
        '/api/submitTransaction',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signedTxXdr: txToSubmit })
        }
      )

      const responseText = await submitResponse.text()
      
      if (!responseText) {
        throw new Error(`Empty response from server: ${submitResponse.status}`)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (e) {
        throw new Error(responseText || `API error: ${submitResponse.status}`)
      }

      if (!submitResponse.ok) {
        throw new Error(result.error || `Transaction failed: ${submitResponse.status}`)
      }

      if (!result.hash) {
        throw new Error('No transaction hash returned')
      }

      setTxHash(result.hash)
      setStatus({ type: 'success', message: 'Transaction successful!' })
      setTxDetails(result)
      await fetchBalance(publicKey)
      setRecipient('')
      setAmount('')
    } catch (error) {
      console.error('Transaction error:', error)
      let errorMsg = error?.message || error?.toString() || 'Unknown error'
      
      if (errorMsg.includes('rejected') || errorMsg.includes('User declined')) {
        errorMsg = 'Transaction rejected. Please approve the transaction in your wallet.'
      } else if (errorMsg.includes('insufficient')) {
        errorMsg = 'Insufficient balance for this transaction.'
      }
      
      setStatus({ type: 'error', message: errorMsg })
    }
    setIsLoading(false)
  }, [publicKey, recipient, amount, fetchBalance])

  useEffect(() => {
    let mounted = true
    
    const checkFreighter = async () => {
      try {
        const connected = await wrapFreighterCall(
          () => isConnected(),
          'Connection check failed'
        )
        setFreighterAvailable(connected.isConnected)
        
        if (mounted && connected.isConnected) {
          const addressObj = await wrapFreighterCall(
            () => getAddress(),
            'Failed to get address'
          )
          if (mounted && addressObj.address) {
            setPublicKey(addressObj.address)
            await fetchBalance(addressObj.address)
          }
        }
      } catch (e) {
        console.log('Freighter not available:', e.message)
        setFreighterAvailable(false)
      }
    }
    
    checkFreighter()
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
        ) : freighterAvailable === false ? (
          <div className="freighter-required">
            <p>Freighter Wallet is not installed or not allowed.</p>
            <a 
              href="https://www.freighter.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="install-link"
            >
              Install Freighter Wallet
            </a>
            <button 
              className="connect-btn" 
              onClick={() => {
                setFreighterAvailable(null)
                setTimeout(() => window.location.reload(), 500)
              }}
            >
              Retry After Installing
            </button>
            <p className="help-text">
              After installing, make sure to allow this site in Freighter settings.
            </p>
          </div>
        ) : freighterAvailable === null ? (
          <div className="loading-check">
            <p>Checking for Freighter Wallet...</p>
            <button 
              className="connect-btn" 
              onClick={connectWallet}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect Freighter Wallet'}
            </button>
          </div>
        ) : (
          <button className="connect-btn" onClick={connectWallet} disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect Freighter Wallet'}
          </button>
        )}

        {status.message && (
          <div className={`status ${status.type}`}>
            {status.message}
            
            {txDetails && (
              <div className="tx-details">
                <p><strong>Hash:</strong> {txDetails.id?.slice(0, 20)}...</p>
                <p><strong>Fee:</strong> {txDetails.fee_charged} stroops</p>
                <p><strong>Operation Count:</strong> {txDetails.operation_count}</p>
              </div>
            )}
            
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
