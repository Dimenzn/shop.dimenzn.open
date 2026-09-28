// --- External Dependencies ---
import Stripe from 'stripe'

// --- Models & Controllers ---
import Product from '../models/productModel.js'
import UI from '../models/uiModel.js'
import User from '../models/userModel.js'

// 🌟 IMPORT THE MASTER FULFILLMENT ENGINE
import { fulfillStripeOrder } from './ordersController.js'

// --- LAZY INITIALIZATION FIX ---
// This ensures Stripe only loads AFTER your market .env files are fully parsed
let stripeInstance = null
const getStripe = () => {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return stripeInstance
}

// ==========================================
// 💳 CREATE PAYMENT INTENT (FOR BUYERS)
// ==========================================
export const createPaymentIntent = async (req, res) => {
  try {
    const stripe = getStripe() // Lazy Load
    const { items, currency = 'usd', email } = req.body
    let trueTotalAmount = 0
    const sellerGroups = {}

    const uiConfig = await UI.findOne()
    const feeType = uiConfig?.platformFeeType || 'percentage'
    const feePercentage = uiConfig?.platformFeePercentage || 0
    const feeFlat = uiConfig?.platformFeeFlat || 0

    // 1. Calculate Subtotals and Shipping per Seller
    for (const item of items) {
      const dbProduct = await Product.findOne({ id: item.productId })

      if (!dbProduct) {
        console.error(`❌ Product not found: ${item.productId}`)
        throw new Error(`Product not found or invalid in DB: ${item.productId}`)
      }

      const realPrice = dbProduct.discountPrice > 0 ? dbProduct.discountPrice : dbProduct.price
      const itemSubtotal = realPrice * item.quantity
      const isPlatformService = dbProduct.isPlatformService === true
      const sellerIdStr = dbProduct.sellerId ? dbProduct.sellerId.toString() : 'platform'

      if (!sellerGroups[sellerIdStr]) {
        sellerGroups[sellerIdStr] = {
          subtotal: 0,
          shipping: 0,
          itemCount: 0,
          isPlatformService: isPlatformService
        }

        // Shipping Logic
        if (isPlatformService) {
          sellerGroups[sellerIdStr].shipping = 0
        } else if (sellerIdStr === 'platform') {
          sellerGroups[sellerIdStr].shipping = uiConfig?.shippingCost || 0
        } else {
          const seller = await User.findById(sellerIdStr)
          if (seller?.storeProfile?.shipping) {
            const { isFree, flatRate } = seller.storeProfile.shipping
            sellerGroups[sellerIdStr].shipping = isFree ? 0 : flatRate || 0
          }
        }
      }

      sellerGroups[sellerIdStr].subtotal += itemSubtotal

      if (!isPlatformService) {
        sellerGroups[sellerIdStr].itemCount += 1
      }
    }

    // 2. Calculate Total Platform Fees and Final Amount
    for (const group of Object.values(sellerGroups)) {
      let groupFee = 0

      if (!group.isPlatformService) {
        if (feeType === 'percentage') {
          groupFee = Math.round(group.subtotal * (feePercentage / 100))
        } else if (feeType === 'flat' && group.itemCount > 0) {
          groupFee = Math.round(feeFlat)
        }
      }

      trueTotalAmount += group.subtotal + group.shipping + groupFee
    }

    // 3. Currency Normalization & Formatting
    const normalizedCurrency = currency.toLowerCase()
    const zeroDecimalCurrencies = [
      'bif',
      'djf',
      'jpy',
      'krw',
      'pyg',
      'vnd',
      'xaf',
      'xpf',
      'clp',
      'gnf',
      'kmf',
      'mga',
      'rwf',
      'vuv',
      'xof'
    ]
    const isZeroDecimal = zeroDecimalCurrencies.includes(normalizedCurrency)
    const stripeAmount = isZeroDecimal
      ? Math.round(trueTotalAmount)
      : Math.round(trueTotalAmount * 100)

    // 4. Configure Supported Methods
    const supportedMethods = ['card']
    if (normalizedCurrency === 'thb') {
      supportedMethods.push('promptpay')
    }

    const intentOptions = {
      amount: stripeAmount,
      currency: normalizedCurrency,
      payment_method_types: supportedMethods, // ['card', 'promptpay']
      // 🌟 THE FIX: Scope future usage strictly to cards so it doesn't fight PromptPay!
      payment_method_options: {
        card: { setup_future_usage: 'off_session' }
      }
    }

    // 5. Customer Attachment (Allows frontend to save cards if applicable)
    if (email) {
      intentOptions.receipt_email = email

      try {
        const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') })
        if (user) {
          let customerId = user.storeProfile?.stripeCustomerId

          if (!customerId) {
            const customer = await stripe.customers.create({
              email: user.email,
              name: `${user.firstName} ${user.lastName}`.trim() || user.email.split('@')[0],
              metadata: { userId: user._id.toString() }
            })
            customerId = customer.id
            if (!user.storeProfile) user.storeProfile = {}
            user.storeProfile.stripeCustomerId = customerId
            await user.save()
          }

          // 🌟 THE FIX: ONLY attach the customer!
          // Do NOT add setup_future_usage here. Let the frontend checkbox handle it!
          intentOptions.customer = customerId
        }
      } catch (err) {
        console.error('❌ [Stripe] Error attaching customer to intent:', err)
      }
    }

    // 6. Create Intent and Return
    const paymentIntent = await stripe.paymentIntents.create(intentOptions)

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      intentId: paymentIntent.id
    })
  } catch (error) {
    console.error('❌ [Stripe] Intent Error:', error)
    res.status(500).json({ success: false, message: 'ERR_STRIPE_INTENT' })
  }
}

// ==========================================
// 💳 VERIFY SAVED CARD (SYNC FRONTEND -> BACKEND)
// ==========================================
export const verifySavedCard = async (req, res) => {
  try {
    const stripe = getStripe() // 👈 Lazy Load
    const user = await User.findById(req.user._id)
    const customerId = user.storeProfile?.stripeCustomerId

    if (!customerId) return res.status(400).json({ success: false, message: 'ERR_NO_CUSTOMER' })

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1
    })

    if (paymentMethods.data.length === 0) {
      return res.status(400).json({ success: false, message: 'ERR_NO_SAVED_CARD' })
    }

    const feesOwed = user.storeProfile?.platformFeesOwed || 0

    if (feesOwed > 0) {
      user.storeProfile.billingLockReason = 'msgSystem.BILLING_RESTRICTED_CHARGE_FAILED'
    } else {
      user.storeProfile.billingStatus = 'active'
      user.storeProfile.billingLockReason = ''
    }

    await user.save()

    return res.status(200).json({
      success: true,
      message: 'BILLING_SUCCESS',
      billingStatus: user.storeProfile.billingStatus
    })
  } catch (error) {
    console.error('❌ [Billing] Verify Card Error:', error)
    res.status(500).json({ success: false, message: 'ERR_SERVER_ERROR' })
  }
}

// ==========================================
// 🛡️ CREATE SETUP INTENT (FOR SELLERS ADDING CARDS)
// ==========================================
export const createSetupIntent = async (req, res) => {
  try {
    const stripe = getStripe() // 👈 Lazy Load
    if (!req.user || req.user.role !== 'seller') {
      return res.status(403).json({ message: 'FORBIDDEN_SELLER_ONLY' })
    }

    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'USER_NOT_FOUND' })

    let customerId = user.storeProfile?.stripeCustomerId

    if (!customerId) {
      console.log(`👤 Creating new Stripe Customer for Seller: ${user.email}`)
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email.split('@')[0],
        metadata: {
          userId: user._id.toString(),
          role: 'seller'
        }
      })

      customerId = customer.id

      if (!user.storeProfile) user.storeProfile = {}
      user.storeProfile.stripeCustomerId = customerId
      await user.save()
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card']
    })

    res.status(200).json({
      success: true,
      clientSecret: setupIntent.client_secret
    })
  } catch (error) {
    console.error('❌ [Stripe] Setup Intent Error:', error)
    res.status(500).json({ success: false, message: 'ERR_SETUP_INTENT' })
  }
}

// ==========================================
// 🪝 STRIPE WEBHOOK RECEIVER
// ==========================================
export const stripeWebhook = async (req, res) => {
  const stripe = getStripe() // 👈 Lazy Load
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error(`❌ [WEBHOOK ERROR] Signature Verification Failed: ${err.message}`)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object

    // 🌟 SCENARIO A: THIS IS A SELLER PAYING THEIR PLATFORM FEE
    if (paymentIntent.metadata && paymentIntent.metadata.action === 'fee_settlement') {
      console.log(`\n💸 [WEBHOOK] EMBEDDED FEE SETTLEMENT SUCCEEDED!`)
      try {
        const user = await User.findById(paymentIntent.metadata.userId)
        if (user) {
          user.storeProfile.platformFeesOwed = 0
          user.storeProfile.billingStatus = 'active'
          user.storeProfile.billingLockReason = ''
          await user.save()
          console.log(
            `🔓 [Billing Guard] Seller ${user.email} reactivated successfully via Embedded PromptPay.`
          )
        }
      } catch (err) {
        console.error('❌ [WEBHOOK] Error unlocking seller store:', err)
      }
      return res.status(200).send() // Stop execution here so it doesn't try to fulfill an order
    }

    // 🌟 SCENARIO B: THIS IS A NORMAL BUYER ORDER
    try {
      const order = await fulfillStripeOrder(paymentIntent.id)
      if (order) {
        const intentCurr = paymentIntent.currency.toLowerCase()
        const isZeroDec = [
          'bif',
          'djf',
          'jpy',
          'krw',
          'pyg',
          'vnd',
          'xaf',
          'xpf',
          'clp',
          'gnf',
          'kmf',
          'mga',
          'rwf',
          'vuv',
          'xof'
        ].includes(intentCurr)
        const displayAmount = isZeroDec ? paymentIntent.amount : paymentIntent.amount / 100
        console.log(`\n========================================`)
        console.log(`✅ [WEBHOOK] PAYMENT SUCCEEDED & ORDER FULFILLED!`)
        console.log(`🆔 Transaction ID: ${paymentIntent.id} | 🧾 Order ID: ${order._id}`)
        console.log(`💰 Amount: ${displayAmount} ${intentCurr.toUpperCase()}`)
        console.log(`========================================\n`)
      }
    } catch (err) {
      console.error('❌ [WEBHOOK] Error fulfilling order from webhook:', err)
    }
  } else if (event.type === 'setup_intent.succeeded') {
    const setupIntent = event.data.object
    console.log(`\n💳 [WEBHOOK] SELLER CARD ADDED SUCCESSFULLY!`)
    try {
      const user = await User.findOne({ 'storeProfile.stripeCustomerId': setupIntent.customer })

      if (user) {
        const feesOwed = user.storeProfile?.platformFeesOwed || 0

        if (feesOwed > 0) {
          console.log(
            `⚠️ [Billing Guard] Seller ${user.email} added a card, but owes ${feesOwed}. Keeping restricted.`
          )
          user.storeProfile.billingLockReason = 'msgSystem.BILLING_RESTRICTED_CHARGE_FAILED'
          await user.save()
        } else {
          user.storeProfile.billingStatus = 'active'
          user.storeProfile.billingLockReason = ''
          await user.save()
          console.log(`🔓 [Billing Guard] Seller ${user.email} reactivated successfully (No Debt).`)
        }
      }
    } catch (err) {
      console.error('❌ [WEBHOOK] Error reactivating seller store:', err)
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const failedIntent = event.data.object
    console.log(`\n❌ [WEBHOOK] PAYMENT FAILED: ${failedIntent.last_payment_error?.message}\n`)
  }

  res.status(200).send()
}

// ==========================================
// 💳 GET SELLER'S SAVED CARD
// ==========================================
export const getSellerCard = async (req, res) => {
  try {
    const stripe = getStripe() // 👈 Lazy Load
    const user = await User.findById(req.user._id)
    const customerId = user?.storeProfile?.stripeCustomerId

    if (!customerId) {
      return res.status(200).json({ hasCard: false })
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1
    })

    if (paymentMethods.data.length > 0) {
      const card = paymentMethods.data[0].card
      return res.status(200).json({
        hasCard: true,
        brand: card.brand,
        last4: card.last4,
        expMonth: card.exp_month,
        expYear: card.exp_year
      })
    }

    res.status(200).json({ hasCard: false })
  } catch (error) {
    console.error('❌ [Stripe] Get Card Error:', error)
    res.status(500).json({ success: false, message: 'ERR_FETCH_CARD' })
  }
}

// ==========================================
// 🗑️ REMOVE SELLER'S SAVED CARD
// ==========================================
export const removeSellerCard = async (req, res) => {
  try {
    const stripe = getStripe() // 👈 Lazy Load
    const user = await User.findById(req.user._id)
    const customerId = user?.storeProfile?.stripeCustomerId

    if (!customerId) return res.status(400).json({ message: 'ERR_NO_CUSTOMER' })

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    })

    // Detach all cards from Stripe
    for (const pm of paymentMethods.data) {
      await stripe.paymentMethods.detach(pm.id)
    }

    // 🌟 THE FIX: Check their debt before applying restrictions!
    const feesOwed = user.storeProfile?.platformFeesOwed || 0

    if (feesOwed > 0) {
      // They owe money and removed their collateral. Lock the store.
      user.storeProfile.billingStatus = 'restricted'
      user.storeProfile.billingLockReason = 'msgSystem.BILLING_RESTRICTED_NO_CARD'
      console.log(
        `🔒 [Billing Guard] Seller ${user.email} restricted for removing card while in debt.`
      )
    } else {
      // They don't owe anything. Let them remove the card and stay active!
      user.storeProfile.billingStatus = 'active'
      user.storeProfile.billingLockReason = ''
      console.log(
        `🔓 [Billing Guard] Seller ${user.email} removed card but remains active (No Debt).`
      )
    }

    await user.save()

    res.status(200).json({ success: true, billingStatus: user.storeProfile.billingStatus })
  } catch (error) {
    console.error('❌ [Stripe] Remove Card Error:', error)
    res.status(500).json({ success: false, message: 'ERR_REMOVE_CARD' })
  }
}

// ==========================================
// 💸 ADMIN: CHARGE SINGLE SELLER (OFF-SESSION)
// ==========================================
export const adminChargeSeller = async (req, res) => {
  try {
    const stripe = getStripe() // 👈 Lazy Load
    const { sellerId } = req.params
    const seller = await User.findById(sellerId)

    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ success: false, message: 'USER_NOT_FOUND' })
    }

    const feesOwed = seller.storeProfile?.platformFeesOwed || 0
    if (feesOwed <= 0) {
      return res.status(400).json({ success: false, message: 'ERR_NO_DEBT' })
    }

    const customerId = seller.storeProfile?.stripeCustomerId
    if (!customerId) {
      seller.storeProfile.billingStatus = 'restricted'
      seller.storeProfile.billingLockReason = 'msgSystem.BILLING_RESTRICTED_NO_CUSTOMER'
      await seller.save()
      return res.status(400).json({ success: false, message: 'ERR_NO_CUSTOMER' })
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1
    })

    if (paymentMethods.data.length === 0) {
      seller.storeProfile.billingStatus = 'restricted'
      seller.storeProfile.billingLockReason = 'msgSystem.BILLING_RESTRICTED_NO_CARD'
      await seller.save()
      return res.status(400).json({ success: false, message: 'ERR_NO_SAVED_CARD' })
    }

    const paymentMethodId = paymentMethods.data[0].id

    const uiConfig = await UI.findOne()
    const currency = (uiConfig?.currency || 'usd').toLowerCase()
    const isZeroDecimal = [
      'bif',
      'djf',
      'jpy',
      'krw',
      'pyg',
      'vnd',
      'xaf',
      'xpf',
      'clp',
      'gnf',
      'kmf',
      'mga',
      'rwf',
      'vuv',
      'xof'
    ].includes(currency)
    const amountToCharge = isZeroDecimal ? Math.round(feesOwed) : Math.round(feesOwed * 100)

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountToCharge,
        currency: currency,
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: `Platform Fees Settlement - ${seller.email}`
      })

      if (paymentIntent.status === 'succeeded') {
        seller.storeProfile.platformFeesOwed = 0
        seller.storeProfile.billingStatus = 'active'
        seller.storeProfile.billingLockReason = ''
        await seller.save()

        return res.status(200).json({ success: true, message: 'MSG_CHARGE_SUCCESS' })
      }
    } catch (stripeError) {
      console.error(`❌ [Billing] Charge failed for ${seller.email}:`, stripeError.message)

      seller.storeProfile.billingStatus = 'restricted'
      seller.storeProfile.billingLockReason = 'msgSystem.BILLING_RESTRICTED_CHARGE_FAILED'
      await seller.save()

      return res.status(402).json({ success: false, message: 'ERR_CHARGE_FAILED' })
    }
  } catch (error) {
    console.error('❌ [Billing] Admin Charge Error:', error)
    res.status(500).json({ success: false, message: 'ERR_SERVER_ERROR' })
  }
}

// ==========================================
// 🤖 CORE ENGINE: PROCESS BATCH BILLING
// ==========================================
export const processBatchBilling = async () => {
  console.log('⚙️ [Billing Engine] Starting batch billing process...')
  const stripe = getStripe() // 👈 Lazy Load

  const sellersInDebt = await User.find({
    role: 'seller',
    'storeProfile.platformFeesOwed': { $gt: 0 }
  })

  if (sellersInDebt.length === 0) {
    console.log('✅ [Billing Engine] No sellers in debt.')
    return { successCount: 0, failCount: 0, results: [] }
  }

  const uiConfig = await UI.findOne()
  const currency = (uiConfig?.currency || 'usd').toLowerCase()

  const zeroDecimalCurrencies = [
    'bif',
    'djf',
    'jpy',
    'krw',
    'pyg',
    'vnd',
    'xaf',
    'xpf',
    'clp',
    'gnf',
    'kmf',
    'mga',
    'rwf',
    'vuv',
    'xof'
  ]
  const isZeroDecimal = zeroDecimalCurrencies.includes(currency)

  let successCount = 0
  let failCount = 0
  const results = []

  for (const seller of sellersInDebt) {
    const feesOwed = seller.storeProfile.platformFeesOwed
    const customerId = seller.storeProfile.stripeCustomerId

    if (!customerId) {
      seller.storeProfile.billingStatus = 'restricted'
      seller.storeProfile.billingLockReason = 'msgSystem.BILLING_RESTRICTED_NO_CUSTOMER'
      await seller.save()
      failCount++
      results.push({ email: seller.email, status: 'failed', reason: 'No Stripe Customer' })
      continue
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1
    })

    if (paymentMethods.data.length === 0) {
      seller.storeProfile.billingStatus = 'restricted'
      seller.storeProfile.billingLockReason = 'msgSystem.BILLING_RESTRICTED_NO_CARD'
      await seller.save()
      failCount++
      results.push({ email: seller.email, status: 'failed', reason: 'No Saved Card' })
      continue
    }

    const amountToCharge = isZeroDecimal ? Math.round(feesOwed) : Math.round(feesOwed * 100)

    try {
      await stripe.paymentIntents.create({
        amount: amountToCharge,
        currency: currency,
        customer: customerId,
        payment_method: paymentMethods.data[0].id,
        off_session: true,
        confirm: true,
        description: `Batch Platform Fees - ${seller.email}`
      })

      seller.storeProfile.platformFeesOwed = 0
      seller.storeProfile.billingStatus = 'active'
      seller.storeProfile.billingLockReason = ''
      await seller.save()

      successCount++
      results.push({ email: seller.email, status: 'success' })
    } catch (err) {
      console.error(`❌ [Billing Engine] Failed to charge ${seller.email}:`, err.message)

      seller.storeProfile.billingStatus = 'restricted'
      seller.storeProfile.billingLockReason = 'msgSystem.BILLING_RESTRICTED_CHARGE_FAILED'
      await seller.save()

      failCount++
      results.push({ email: seller.email, status: 'failed', reason: err.message })
    }
  }

  console.log(`✅ [Billing Engine] Complete. Success: ${successCount}, Failed/Locked: ${failCount}`)
  return { successCount, failCount, results }
}

// ==========================================
// 💸 ADMIN: BATCH CHARGE (MANUAL ROUTE)
// ==========================================
export const adminChargeAllSellers = async (req, res) => {
  try {
    const result = await processBatchBilling()

    if (result.successCount === 0 && result.failCount === 0) {
      return res.status(200).json({ success: true, message: 'MSG_NO_DEBTS_FOUND', results: [] })
    }

    res.status(200).json({
      success: true,
      stats: {
        total: result.successCount + result.failCount,
        success: result.successCount,
        failed: result.failCount
      },
      results: result.results
    })
  } catch (error) {
    console.error('❌ [Billing] Admin Batch Charge Error:', error)
    res.status(500).json({ success: false, message: 'ERR_SERVER_ERROR' })
  }
}

// ==========================================
// 💸 SELLER: MANUALLY SETTLE OUTSTANDING DEBT
// ==========================================
export const settleSellerDebt = async (req, res) => {
  try {
    const stripe = getStripe() // 👈 Lazy Load
    const user = await User.findById(req.user._id)
    const feesOwed = user.storeProfile?.platformFeesOwed || 0
    const customerId = user.storeProfile?.stripeCustomerId

    if (feesOwed <= 0) {
      return res.status(400).json({ success: false, message: 'ERR_NO_FEES_TO_SETTLE' })
    }
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'ERR_NO_BILLING_PROFILE' })
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1
    })

    if (paymentMethods.data.length === 0) {
      return res.status(400).json({ success: false, message: 'ERR_ADD_PAYMENT_METHOD_FIRST' })
    }

    const uiConfig = await UI.findOne()
    const currency = (uiConfig?.currency || 'usd').toLowerCase()
    const zeroDecimalCurrencies = [
      'bif',
      'djf',
      'jpy',
      'krw',
      'pyg',
      'vnd',
      'xaf',
      'xpf',
      'clp',
      'gnf',
      'kmf',
      'mga',
      'rwf',
      'vuv',
      'xof'
    ]
    const isZeroDecimal = zeroDecimalCurrencies.includes(currency)

    const amountToCharge = isZeroDecimal ? Math.round(feesOwed) : Math.round(feesOwed * 100)

    try {
      await stripe.paymentIntents.create({
        amount: amountToCharge,
        currency: currency,
        customer: customerId,
        payment_method: paymentMethods.data[0].id,
        off_session: true,
        confirm: true,
        description: `Manual Debt Settlement - ${user.email}`
      })

      user.storeProfile.platformFeesOwed = 0
      user.storeProfile.billingStatus = 'active'
      user.storeProfile.billingLockReason = ''
      await user.save()

      return res.status(200).json({
        success: true,
        message: 'MSG_PAYMENT_SUCCESS',
        billingStatus: 'active'
      })
    } catch (chargeError) {
      console.error(
        `❌ [Billing] Seller ${user.email} manual settlement failed:`,
        chargeError.message
      )

      return res.status(402).json({
        success: false,
        message: 'ERR_PAYMENT_DECLINED'
      })
    }
  } catch (error) {
    console.error('❌ [Billing] Settle Debt Error:', error)
    res.status(500).json({ success: false, message: 'ERR_SERVER_ERROR' })
  }
}

// ==========================================
// 💸 SELLER: EMBEDDED FEE SETTLEMENT (PROMPTPAY + CARD)
// ==========================================
export const createFeeCheckout = async (req, res) => {
  try {
    const stripe = getStripe() // 👈 Lazy Load
    const user = await User.findById(req.user._id)
    const feesOwed = user.storeProfile?.platformFeesOwed || 0

    if (feesOwed <= 0) {
      return res.status(400).json({ success: false, message: 'ERR_NO_FEES_TO_SETTLE' })
    }

    // 🌟 1. ENSURE THE SELLER HAS A STRIPE CUSTOMER ID (Required for saving cards!)
    let customerId = user.storeProfile?.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email.split('@')[0],
        metadata: { userId: user._id.toString(), role: 'seller' }
      })
      customerId = customer.id
      user.storeProfile.stripeCustomerId = customerId
      await user.save()
    }

    const uiConfig = await UI.findOne()
    const currency = (uiConfig?.currency || 'usd').toLowerCase()
    const isZeroDecimal = [
      'bif',
      'djf',
      'jpy',
      'krw',
      'pyg',
      'vnd',
      'xaf',
      'xpf',
      'clp',
      'gnf',
      'kmf',
      'mga',
      'rwf',
      'vuv',
      'xof'
    ].includes(currency)

    const amountToCharge = isZeroDecimal ? Math.round(feesOwed) : Math.round(feesOwed * 100)

    // 🌟 THE FIX: Dynamically set allowed payment methods based on currency!
    // PromptPay will CRASH the Stripe API if the currency is not Thai Baht (THB).
    const allowedPaymentMethods = currency === 'thb' ? ['promptpay', 'card'] : ['card']

    // 🌟 2. ATTACH THE CUSTOMER ID TO THE INTENT
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountToCharge,
      currency: currency,
      customer: customerId,
      payment_method_types: allowedPaymentMethods, // 👈 Apply dynamic array here
      // 🌟 THE FIX: Same scoped option here!
      payment_method_options: {
        card: { setup_future_usage: 'off_session' }
      },
      metadata: {
        userId: user._id.toString(),
        action: 'fee_settlement'
      }
    })

    res.status(200).json({ success: true, clientSecret: paymentIntent.client_secret })
  } catch (error) {
    console.error('❌ [Billing] Embedded Checkout Error:', error)
    res.status(500).json({ success: false, message: 'ERR_SERVER_ERROR' })
  }
}
