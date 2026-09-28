// --- Models ---
import Order from '../models/orderModel.js'
import Cart from '../models/cartModel.js'
import Product from '../models/productModel.js'
import UI from '../models/uiModel.js'
import User from '../models/userModel.js'
import Language from '../models/languageModel.js'
import ActivationKey from '../models/activationKeyModel.js'

// --- Services & Utils ---
import { sendEmail } from '../services/mail.service.js'
import {
  getOrderConfirmationTemplate,
  getAdminOrderNotificationTemplate,
  getSellerOrderNotificationTemplate,
  getDigitalOrderConfirmationTemplate
} from '../utils/emailTemplates.js'

// ==========================================
// 🛒 CREATE NEW ORDER (SPLIT-CART ARCHITECTURE)
// ==========================================
export const createOrder = async (req, res) => {
  try {
    // 🌟 0. LAZY GARBAGE COLLECTION
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      await Order.deleteMany({ status: 'draft', createdAt: { $lt: twentyFourHoursAgo } })
    } catch (gcError) {
      console.error('⚠️ [Garbage Collector] Failed:', gcError)
    }

    const {
      contactInfo,
      shippingAddress,
      paymentMethod,
      note,
      cartId,
      locale,
      currency,
      transactionId
    } = req.body

    const userId = req.user ? req.user._id : null
    const isStripe = paymentMethod === 'stripe'

    // --- 1. FETCH UI CONFIG & VALIDATE SHIPPING ---
    const uiSettings = await UI.findOne()
    if (uiSettings?.showCountry) {
      if (!uiSettings.allowedCountries.includes(shippingAddress.country)) {
        return res.status(400).json({ message: 'ORDER_COUNTRY_ERROR' })
      }
    }

    // 🌟 NEW: Extract the Secure Platform Fee Config
    const feeType = uiSettings?.platformFeeType || 'percentage'
    const feePercentage = uiSettings?.platformFeePercentage || 0
    const feeFlat = uiSettings?.platformFeeFlat || 0

    // --- 2. RETRIEVE CART ---
    let cart = userId ? await Cart.findOne({ userId }) : await Cart.findById(cartId)
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: 'CART_EMPTY_SIMPLE' })

    // --- 3. PROCESS ITEMS & GROUP BY SELLER ---
    const sellerGroups = {}

    for (const item of cart.items) {
      const product = await Product.findOne({ id: item.productId })
      if (!product) continue

      const currentLocaleData = product.locales[locale] || Object.values(product.locales)[0] || {}
      if (!currentLocaleData.title) return res.status(400).json({ message: 'ORDER_PROD_MISSING' })

      let targetSizeId = null

      if (item.size) {
        const sizeObj = product.sizes?.find(s => s.size === item.size)
        if (!sizeObj || sizeObj.qty < item.quantity)
          return res.status(400).json({ message: 'ORDER_STOCK_ERR' })
        targetSizeId = sizeObj.id
      } else {
        const currentQty = product.quantity || 0
        if (currentQty < item.quantity) return res.status(400).json({ message: 'ORDER_STOCK_ERR' })
      }

      const originalPrice = product.price
      const discountPrice = product.discountPrice
      const finalPrice =
        discountPrice && discountPrice > 0 && discountPrice < originalPrice
          ? discountPrice
          : originalPrice

      const sellerIdStr = product.sellerId ? product.sellerId.toString() : 'platform'

      if (!sellerGroups[sellerIdStr]) {
        sellerGroups[sellerIdStr] = {
          sellerId: product.sellerId || null,
          items: [],
          subtotal: 0
        }
      }

      sellerGroups[sellerIdStr].items.push({
        productId: item.productId,
        sellerId: product.sellerId || null,
        title: currentLocaleData.title,
        price: finalPrice,
        quantity: item.quantity,
        size: item.size,
        sizeId: targetSizeId,
        image: currentLocaleData.images?.[0] || '',
        platformFee: 0 // Will populate this in the next step to prevent rounding drift
      })

      sellerGroups[sellerIdStr].subtotal += finalPrice * item.quantity
    }

    // --- 4. PREPARE TO SAVE MULTIPLE ORDERS ---
    if (isStripe && transactionId) {
      await Order.deleteMany({ transactionId, status: 'draft' })
    }

    const savedOrders = []

    for (const [sellerIdStr, group] of Object.entries(sellerGroups)) {
      let packageShippingCost = 0

      if (sellerIdStr !== 'platform') {
        const seller = await User.findById(sellerIdStr)
        if (seller && seller.storeProfile && seller.storeProfile.shipping) {
          const { isFree, flatRate } = seller.storeProfile.shipping
          packageShippingCost = isFree === true ? 0 : flatRate || 0
        }
      } else {
        packageShippingCost = uiSettings?.shippingCost || 0
      }

      // 🌟 NEW: Calculate the exact fee for this specific Seller's Package
      let groupFee = 0
      if (feeType === 'percentage') {
        groupFee = Math.round(group.subtotal * (feePercentage / 100))
      } else if (feeType === 'flat' && group.items.length > 0) {
        groupFee = Math.round(feeFlat)
      }

      // Attach the fee to the first item in the array to fulfill the snapshot schema requirements
      if (group.items.length > 0) {
        group.items[0].platformFee = groupFee
      }

      // 🌟 NEW: Add the fee to the Grand Total
      let packageTotal = group.subtotal + packageShippingCost + groupFee

      const newOrder = new Order({
        user: userId,
        contactInfo,
        shippingAddress,
        items: group.items,
        platformFeeTotal: groupFee, // Save the snapshot to the main order
        totalAmount: packageTotal,
        currency,
        paymentMethod,
        note,
        locale,
        status: isStripe ? 'draft' : 'pending',
        transactionId: isStripe ? transactionId : null,
        isPaid: false
      })

      const saved = await newOrder.save()
      savedOrders.push(saved)
    }

    // --- 5. FINALIZE ---
    if (isStripe) {
      return res.status(201).json({ isDraft: true, orderId: savedOrders[0]._id })
    }

    await processMultiFulfillment(savedOrders, locale, cartId)
    res.status(201).json({ success: true, message: 'ORDER_SUCCESS', orderId: savedOrders[0]._id })
  } catch (error) {
    console.error('❌ [Orders] Create order crash:', error)
    res.status(500).json({ message: 'ORDER_PROCESS_ERR' })
  }
}

// ==========================================
// 📧 DIGITAL ORDER EMAIL DISPATCHER
// ==========================================
const sendDigitalOrderEmail = async order => {
  try {
    const uiSettings = await UI.findOne()
    const companyName = uiSettings?.companyName || 'Web-Shop'

    const buyerEmail = order.contactInfo?.email
    const buyerName = order.contactInfo?.firstName || buyerEmail?.split('@')[0] || 'Customer'

    // Get translations
    const langDoc =
      (await Language.findOne({ value: order.locale })) ||
      (await Language.findOne({ value: 'en-US' }))

    const tBuyer = langDoc?.i18n?.eDigitalOrder
    const tAdmin = langDoc?.i18n?.eAdminOrder // 🌟 Fetch admin translations

    if (!buyerEmail) return

    // ------------------------------------------
    // 1. NOTIFY THE BUYER
    // ------------------------------------------
    const buyerOrderLink = `${process.env.BASE_URL_EMAIL_REDIRECT}/profile`

    // Fallback subject if translation is missing
    const buyerSubject = tBuyer?.DIGITAL_ORDER_SUBJECT
      ? `${tBuyer.DIGITAL_ORDER_SUBJECT} - ${companyName}`
      : `🔑 Your Digital Key is Ready! - ${companyName}`

    sendEmail({
      to: buyerEmail,
      subject: buyerSubject,
      html: getDigitalOrderConfirmationTemplate(
        buyerName,
        companyName,
        order,
        buyerOrderLink,
        tBuyer
      )
    })
    console.log(`📧 [Orders] Digital Key email sent to ${buyerEmail}`)

    // ------------------------------------------
    // 2. NOTIFY ALL ADMINS
    // ------------------------------------------
    const admins = await User.find({ role: 'admin', isActive: true })
    const adminOrderLink = `${process.env.BASE_URL_EMAIL_REDIRECT}/order/${order._id}?lang=${langDoc.value}`

    const adminSubject = tAdmin?.ADMIN_ORDER_SUBJECT
      ? `${tAdmin.ADMIN_ORDER_SUBJECT} #${order._id}`
      : `New Order Notification #${order._id}`

    for (const admin of admins) {
      if (admin.email) {
        sendEmail({
          to: admin.email,
          subject: adminSubject,
          html: getAdminOrderNotificationTemplate(
            companyName,
            order,
            buyerEmail,
            adminOrderLink,
            tAdmin // You can safely reuse the standard admin order template!
          )
        })
      }
    }
    console.log(`📧 [Orders] Admin notifications sent for digital order ${order._id}`)
  } catch (error) {
    console.error('❌ [Orders] Digital Email dispatch error:', error)
  }
}

// ==========================================
// ⚡ STRIPE WEBHOOK FULFILLMENT
// ==========================================
export const fulfillStripeOrder = async intentId => {
  try {
    const order = await Order.findOne({ transactionId: intentId })
    if (!order) throw new Error('Order not found for Intent ID')

    order.isPaid = true
    order.status = 'confirmed'

    const isDigitalOrder = order.items.some(item => item.size === 'Digital')

    if (isDigitalOrder) {
      console.log(`🔑 [Orders] Digital purchase detected. Generating Seller Key...`)

      const newKeyString = generateSellerKey()

      const newDbKey = new ActivationKey({
        key: newKeyString,
        type: 'seller_upgrade',
        isUsed: false,
        createdBy: order.user
      })
      await newDbKey.save()

      order.digitalKey = newKeyString
      console.log(`✅ [Orders] Key ${newKeyString} generated and saved!`)
    }

    // Save the finalized order
    await order.save()

    // ==========================================
    // 🌟 TRIGGER THE APPROPRIATE ENGINE
    // ==========================================
    if (isDigitalOrder) {
      // Use our safe, cart-friendly digital mailer
      await sendDigitalOrderEmail(order)
    } else {
      // Use your master engine for physical goods
      await processMultiFulfillment([order], order.locale, order.cartId)
    }

    return order
  } catch (error) {
    console.error('❌ [Orders] Fulfillment Error:', error)
    return null
  }
}

// ==========================================
// ⚙️ THE MASTER FULFILLMENT ENGINE
// ==========================================
const processMultiFulfillment = async (orders, locale, cartId = null) => {
  if (!orders || orders.length === 0) return

  for (const order of orders) {
    for (const item of order.items) {
      const product = await Product.findOne({ id: item.productId })
      if (!product) continue

      if (item.size) {
        const sizeToUpdate = product.sizes?.find(s => s.id === item.sizeId)
        if (sizeToUpdate) sizeToUpdate.qty -= item.quantity
      } else {
        if (product.quantity != null) product.quantity -= item.quantity
      }

      product.sold = (product.sold || 0) + item.quantity
      await product.save()
    }
  }

  try {
    const firstOrder = orders[0]
    if (firstOrder.user) {
      await Cart.findOneAndUpdate({ userId: firstOrder.user }, { items: [] })
    } else if (cartId) {
      await Cart.findByIdAndUpdate(cartId, { items: [] })
    }
  } catch (err) {
    console.error('Cart clearing error:', err)
  }

  try {
    const uiSettings = await UI.findOne()
    const companyName = uiSettings?.companyName || 'Web-Shop'

    const firstOrder = orders[0]
    const allItems = orders.flatMap(o => o.items)
    const grandTotal = orders.reduce((sum, o) => sum + o.totalAmount, 0)

    const isRegistered = !!firstOrder.userId
    const displayId = orders.length > 1 ? `${firstOrder._id}-MULTI` : firstOrder._id

    const masterOrderForBuyer = {
      ...firstOrder.toObject(),
      _id: displayId,
      items: allItems,
      totalAmount: grandTotal
    }

    const buyerEmail = firstOrder.contactInfo?.email
    const buyerName = firstOrder.contactInfo?.firstName || buyerEmail?.split('@')[0] || 'Customer'

    const langDoc =
      (await Language.findOne({ value: locale })) || (await Language.findOne({ value: 'en-US' }))
    const tBuyer = langDoc?.i18n?.eOrder

    let buyerOrderLink = ''
    if (isRegistered) {
      buyerOrderLink = `${process.env.BASE_URL_EMAIL_REDIRECT}/profile?tab=orders`
    } else if (orders.length === 1) {
      buyerOrderLink = `${process.env.BASE_URL_EMAIL_REDIRECT}/order/${firstOrder._id}?lang=${langDoc.value}`
    } else {
      const allIds = orders.map(o => o._id).join(',')
      buyerOrderLink = `${process.env.BASE_URL_EMAIL_REDIRECT}/order/multi?ids=${allIds}&lang=${langDoc.value}`
    }

    if (buyerEmail && tBuyer) {
      sendEmail({
        to: buyerEmail,
        subject: `${tBuyer.ORDER_SUBJECT} - ${companyName}`,
        html: getOrderConfirmationTemplate(
          buyerName,
          companyName,
          masterOrderForBuyer,
          buyerOrderLink,
          tBuyer
        )
      })
    }

    const admins = await User.find({ role: 'admin', isActive: true })

    for (const order of orders) {
      const orderSellerId = order.items[0]?.sellerId

      if (orderSellerId) {
        const seller = await User.findById(orderSellerId)
        if (seller && seller.email) {
          const sellerName = seller.firstName || seller.email.split('@')[0]
          const sellerLink = `${process.env.BASE_URL_EMAIL_REDIRECT}/panel`
          const tSeller = langDoc?.i18n?.eSellerOrder || {}

          sendEmail({
            to: seller.email,
            subject: `New Sale! Order #${order._id}`,
            html: getSellerOrderNotificationTemplate(
              sellerName,
              companyName,
              order,
              sellerLink,
              tSeller
            )
          })
        }
      }

      for (const admin of admins) {
        const tAdmin = langDoc?.i18n?.eAdminOrder
        const adminOrderLink = `${process.env.BASE_URL_EMAIL_REDIRECT}/order/${order._id}?lang=${langDoc.value}`

        if (tAdmin && admin.email) {
          sendEmail({
            to: admin.email,
            subject: `${tAdmin.ADMIN_ORDER_SUBJECT} #${order._id}`,
            html: getAdminOrderNotificationTemplate(
              companyName,
              order,
              buyerEmail,
              adminOrderLink,
              tAdmin
            )
          })
        }
      }
    }
  } catch (emailError) {
    console.error('❌ [Orders] Email dispatch error:', emailError)
  }
}

// ==========================================
// 🔍 GET SINGLE ORDER
// ==========================================
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean()
    const isPolling = req.query.polling === 'true'

    if (!order || (!isPolling && order.status === 'draft')) {
      return res.status(404).json({ message: 'ORDER_NOT_FOUND' })
    }

    const firstItemSellerId = order.items?.[0]?.sellerId

    if (firstItemSellerId) {
      const seller = await User.findById(firstItemSellerId).select('storeProfile').lean()
      if (seller) {
        order.sellerData = seller
      }
    }

    if (req.user?.role === 'seller') {
      const hasItem = order.items.some(
        item => item.sellerId && item.sellerId.toString() === req.user._id.toString()
      )
      if (!hasItem) return res.status(403).json({ message: 'FORBIDDEN_NOT_YOUR_ORDER' })

      order.items = order.items.filter(
        item => item.sellerId && item.sellerId.toString() === req.user._id.toString()
      )
      return res.status(200).json(order)
    }

    res.status(200).json(order)
  } catch {
    res.status(500).json({ message: 'GEN_ERR' })
  }
}

export const getMyOrders = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: 'AUTH_REQUIRED' })

    const orders = await Order.find({
      user: req.user._id,
      status: { $ne: 'draft' }
    }).sort({ createdAt: -1 })

    res.status(200).json({ success: true, orders })
  } catch {
    res.status(500).json({ message: 'GEN_ERR' })
  }
}

export const getSellerOrders = async (req, res) => {
  try {
    if (!req.user || !['seller', 'platform'].includes(req.user.role)) {
      return res.status(403).json({ message: 'FORBIDDEN_SELLER_ONLY' })
    }

    const { page = 1, limit = 10, search = '', statuses = '' } = req.query
    const query = { 'items.sellerId': req.user._id }

    if (statuses) {
      const statusArray = statuses.split(',')
      query.status = { $in: statusArray, $ne: 'draft' }
    } else {
      query.status = { $ne: 'draft' }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      query['$or'] = [
        { 'contactInfo.email': searchRegex },
        { 'contactInfo.firstName': searchRegex },
        { 'contactInfo.lastName': searchRegex }
      ]
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))

    const count = await Order.countDocuments(query)

    const filteredOrders = orders.map(order => {
      const orderObj = order.toObject()
      orderObj.items = orderObj.items.filter(
        item => item.sellerId && item.sellerId.toString() === req.user._id.toString()
      )
      return orderObj
    })

    res.status(200).json({
      success: true,
      orders: filteredOrders,
      currentPage: Number(page),
      totalOrders: count
    })
  } catch (error) {
    console.error('❌ [Orders] Seller fetch error:', error)
    res.status(500).json({ message: 'GEN_ERR' })
  }
}

// ==========================================
// 🏪 SAVE/UPDATE SELLER ORDERS
// ==========================================
export const saveSellerOrders = async (req, res) => {
  try {
    if (!['seller', 'platform'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'FORBIDDEN_SELLER_ONLY' })
    }

    const { orders } = req.body
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ message: 'VAL_MISSING_FIELDS' })
    }

    // 🌟 1. FETCH DYNAMIC GAME RULES
    const uiConfig = (await UI.findOne()) || {}
    const gameRules = {
      slaConfirm: uiConfig.slaConfirmHours ?? 24,
      slaShip: uiConfig.slaShipHours ?? 48,
      bonusConfirm: uiConfig.scoreConfirmBonus ?? 2,
      bonusShip: uiConfig.scoreShipBonus ?? 3,
      bonusDelivery: uiConfig.scoreDeliveryBase ?? 10,
      penaltyCancel: uiConfig.scoreCancelPenalty ?? 40,
      penaltyRestock: uiConfig.scoreRestockPenalty ?? 15
    }

    for (const orderUpdate of orders) {
      const dbOrder = await Order.findOne({
        _id: orderUpdate._id,
        'items.sellerId': req.user._id
      })

      if (!dbOrder) continue

      // 🛑 1. THE TERMINAL STATE GUARD
      if (dbOrder.status === 'delivered') {
        console.warn(`🔒 [Billing Guard] Ignored status change for locked order: ${dbOrder._id}`)
        continue
      }

      const oldStatus = dbOrder.status
      const newStatus = orderUpdate.status
      const isCOD = dbOrder.paymentMethod && dbOrder.paymentMethod.toLowerCase() === 'cod'

      // Ensure the scoreAwarded tracking object exists on this order
      if (!dbOrder.scoreAwarded) {
        dbOrder.scoreAwarded = { confirmed: false, shipped: false }
      }

      // =========================================================
      // 🌟 THE TRUST SCORE ENGINE (Micro-Dosing & SLAs)
      // =========================================================
      let pointsToAdd = 0
      let platformFeeToCharge = 0

      // Calculate how old the order is in hours (PRODUCTION MATH)

      // 🛠️ DEV HACK: Make Admin UI "Hours" act like "Seconds"
      // const now = new Date()
      // const orderAgeHours = (now - new Date(dbOrder.createdAt)) / 1000
      // 🛠️ DEV HACK

      // *** REAL LIFE
      const now = new Date()
      const orderAgeHours = (now - new Date(dbOrder.createdAt)) / (1000 * 60 * 60)
      // *** REAL LIFE

      // 1. The Acknowledgement Bonus
      // Rule: Must be confirmed within SLA threshold
      if (newStatus === 'confirmed' && !dbOrder.scoreAwarded.confirmed) {
        dbOrder.scoreAwarded.confirmed = true // Mark it used regardless of time

        if (orderAgeHours <= gameRules.slaConfirm) {
          pointsToAdd += gameRules.bonusConfirm
          console.log(
            `📈 [Trust] Order ${dbOrder._id} confirmed on time. +${gameRules.bonusConfirm} SR`
          )
        } else {
          console.log(
            `⏳ [Trust] Order ${dbOrder._id} confirmed late (${orderAgeHours.toFixed(1)}h). 0 SR`
          )
        }
      }

      // 2. The Dispatch Bonus
      // Rule: Must be shipped within SLA threshold
      if (newStatus === 'shipped' && !dbOrder.scoreAwarded.shipped) {
        dbOrder.scoreAwarded.shipped = true // Mark it used

        if (orderAgeHours <= gameRules.slaShip) {
          pointsToAdd += gameRules.bonusShip
          console.log(`📈 [Trust] Order ${dbOrder._id} shipped on time. +${gameRules.bonusShip} SR`)
        } else {
          console.log(
            `⏳ [Trust] Order ${dbOrder._id} shipped late (${orderAgeHours.toFixed(1)}h). 0 SR`
          )
        }
      }

      // 3. The Delivery Base & Billing Ledger
      if (isCOD) {
        if (newStatus === 'delivered') {
          dbOrder.isPaid = true
          dbOrder.paidAt = new Date()

          if (!dbOrder.platformFeeCharged && dbOrder.platformFeeTotal > 0) {
            pointsToAdd += gameRules.bonusDelivery
            platformFeeToCharge = dbOrder.platformFeeTotal

            dbOrder.platformFeeCharged = true // 🔒 Lock it!
            console.log(
              `💰 [COD SETTLED] Order ${dbOrder._id} delivered. Fee applied! +${gameRules.bonusDelivery} SR`
            )
          }
        } else if (newStatus === 'cancelled' || newStatus === 'cancelled_restored') {
          dbOrder.isPaid = false
        }
      }

      // ---------------------------------------------------------
      // 🚨 SEVERE PENALTY: FULFILLMENT FAILURE
      // ---------------------------------------------------------
      if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        pointsToAdd -= gameRules.penaltyCancel // 🌟 FIXED
        console.log(
          `📉 [Trust System] Seller cancelled order ${dbOrder._id} (Lost/Out-of-Stock). -${gameRules.penaltyCancel} SR`
        )
      }

      // ---------------------------------------------------------
      // SCENARIO A: RESTOCKING & MINOR PENALTY
      // ---------------------------------------------------------
      if (newStatus === 'cancelled_restored' && oldStatus !== 'cancelled_restored') {
        console.log(`♻️ [Orders] Restocking items for order: ${dbOrder._id}`)

        pointsToAdd -= gameRules.penaltyRestock // 🌟 FIXED
        console.log(
          `📉 [Trust System] Order ${dbOrder._id} returned and restocked. -${gameRules.penaltyRestock} SR`
        )

        for (const item of dbOrder.items) {
          if (item.sellerId && item.sellerId.toString() !== req.user._id.toString()) continue

          if (item.productId && item.quantity > 0) {
            const product = await Product.findOne({ id: item.productId })

            if (product) {
              if (item.size) {
                let sizeObj = null
                if (item.sizeId) sizeObj = product.sizes?.find(s => s.id === item.sizeId)
                if (!sizeObj && item.size) sizeObj = product.sizes?.find(s => s.size === item.size)

                if (sizeObj) sizeObj.qty = (parseInt(sizeObj.qty) || 0) + item.quantity
              } else {
                product.quantity = (parseInt(product.quantity) || 0) + item.quantity
              }

              product.sold = Math.max(0, (product.sold || 0) - item.quantity)
              await product.save()
            }
          }
        }
      }
      // ---------------------------------------------------------
      // SCENARIO B: UN-RESTOCKING
      // ---------------------------------------------------------
      else if (oldStatus === 'cancelled_restored' && newStatus !== 'cancelled_restored') {
        console.log(`⚠️ [Orders] Reversing restock (Deducting) for order: ${dbOrder._id}`)

        for (const item of dbOrder.items) {
          if (item.sellerId && item.sellerId.toString() !== req.user._id.toString()) continue

          if (item.productId && item.quantity > 0) {
            const product = await Product.findOne({ id: item.productId })

            if (product) {
              if (item.size) {
                let sizeObj = null
                if (item.sizeId) sizeObj = product.sizes?.find(s => s.id === item.sizeId)
                if (!sizeObj && item.size) sizeObj = product.sizes?.find(s => s.size === item.size)

                if (sizeObj) sizeObj.qty = Math.max(0, (parseInt(sizeObj.qty) || 0) - item.quantity)
              } else {
                product.quantity = Math.max(0, (parseInt(product.quantity) || 0) - item.quantity)
              }

              product.sold = (product.sold || 0) + item.quantity
              await product.save()
            }
          }
        }
      }

      // =========================================================
      // 🏦 SINGLE DATABASE SAVE (Points & Debt)
      // =========================================================
      if (pointsToAdd !== 0 || platformFeeToCharge > 0) {
        const seller = await User.findById(req.user._id)
        if (seller && seller.storeProfile) {
          // Apply Fee
          if (platformFeeToCharge > 0) {
            seller.storeProfile.platformFeesOwed =
              (seller.storeProfile.platformFeesOwed || 0) + platformFeeToCharge
          }

          // Apply Points & Enforce Hard Caps (0 to 5000)
          if (pointsToAdd !== 0) {
            const currentScore = seller.storeProfile.trustScore ?? 1500
            let newScore = currentScore + pointsToAdd
            if (newScore > 5000) newScore = 5000
            if (newScore < 0) newScore = 0
            seller.storeProfile.trustScore = newScore
          }

          await seller.save()
        }
      }

      dbOrder.status = newStatus
      await dbOrder.save()
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('❌ [Orders] Seller save error:', error)
    res.status(500).json({ message: 'GEN_ERR' })
  }
}

// ==========================================
// ⚡ CREATE EXPRESS DIGITAL ORDER
// ==========================================
export const createExpressDigitalOrder = async (req, res) => {
  try {
    const { contactInfo, shippingAddress, items, paymentMethod, currency, locale, transactionId } =
      req.body

    // 🌟 ZERO-TRUST SECURITY: Fetch the REAL product from the database
    const dbProduct = await Product.findOne({ id: items[0].productId })
    if (!dbProduct) {
      return res.status(404).json({ message: 'Product not found' })
    }

    // Determine if it has a discount
    const realPrice = dbProduct.discountPrice > 0 ? dbProduct.discountPrice : dbProduct.price
    const totalAmount = realPrice * items[0].quantity

    // 🌟 1. Grab the correct language data (Title & Cloudinary Image)
    const currentLocaleData = dbProduct.locales[locale] || Object.values(dbProduct.locales)[0] || {}

    // 🌟 2. Completely RECONSTRUCT the item securely, overriding the frontend's payload
    const secureItems = [
      {
        productId: dbProduct.id,
        sellerId: dbProduct.sellerId,
        title: currentLocaleData.title || 'Digital Service', // Real localized title
        price: realPrice, // Secure price
        quantity: items[0].quantity,
        platformFee: 0,
        size: 'Digital',
        image: currentLocaleData.images?.[0] || '' // 🌟 Securely grab the Cloudinary image!
      }
    ]

    // Build the Order using the secure items
    const newOrder = new Order({
      user: req.user._id,
      contactInfo,
      shippingAddress,
      items: secureItems, // <-- Use the secure reconstructed array
      platformFeeTotal: 0,
      totalAmount, // Securely calculated
      currency,
      locale,
      paymentMethod,
      transactionId,
      isPaid: false,
      status: paymentMethod === 'stripe' ? 'draft' : 'pending'
    })

    const savedOrder = await newOrder.save()

    res.status(200).json({ success: true, orderId: savedOrder._id })
  } catch (error) {
    console.error('❌ [Orders] Express Digital Create Error:', error)
    res.status(500).json({ message: 'ERR_CREATE_ORDER' })
  }
}

// ==========================================
// 🔍 GET ORDER STATUS (For Webhook Polling)
// ==========================================
export const getOrderStatus = async (req, res) => {
  try {
    // 🌟 Added 'digitalKey' to the select statement
    const order = await Order.findById(req.params.id).select('isPaid status digitalKey')

    if (!order) {
      return res.status(404).json({ message: 'ORDER_NOT_FOUND' })
    }

    res.status(200).json({
      isPaid: order.isPaid,
      status: order.status,
      digitalKey: order.digitalKey // 🌟 Pass the key to the frontend!
    })
  } catch (error) {
    console.error('❌ [Orders] Get Status Error:', error)
    res.status(500).json({ message: 'ERR_FETCH_STATUS' })
  }
}

// 🌟 HELPER: Generate a random 14-character Seller Key
const generateSellerKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let key = 'SELL-'
  for (let i = 0; i < 4; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
  key += '-'
  for (let i = 0; i < 4; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
  return key
}
