import Cart from '../models/cartModel.js'
import Product from '../models/productModel.js'

// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================

/**
 * Validates cart items against the active database.
 * If a product was deleted by an admin while sitting in a user's cart,
 * this removes it automatically and saves the sanitized cart.
 */
const validateAndCleanCart = async cart => {
  if (!cart || cart.items.length === 0) return cart

  // Check if every item in the cart still exists in the Product collection
  const checkPromises = cart.items.map(async item => {
    const productExists = await Product.exists({ id: item.productId })
    return productExists ? item : null
  })

  const results = await Promise.all(checkPromises)
  const validItems = results.filter(item => item !== null)

  // If discrepancies are found, update the database atomically
  if (validItems.length !== cart.items.length) {
    await Cart.findByIdAndUpdate(cart._id, {
      $set: { items: validItems }
    })
    cart.items = validItems
    console.log(`🧹 [Cart] Cleaned up obsolete items for cart: ${cart._id}`)
  }

  return cart
}

/**
 * Finds a cart either by authenticated User ID or Guest Cart ID.
 */
const findCart = async (userId, guestCartId) => {
  if (userId) return Cart.findOne({ userId: userId })
  if (guestCartId) return Cart.findById(guestCartId)
  return null
}

// ==========================================
// 👤 AUTHENTICATED USER ROUTES
// ==========================================

/**
 * Fetches the authenticated user's cart, cleaning it of deleted products.
 */
export const getCart = async (req, res) => {
  try {
    const userId = req.user._id // Injected via verifyAccessToken middleware

    let cart = await Cart.findOne({ userId: userId })

    if (!cart) {
      return res.status(200).json({ userId, items: [] })
    }

    cart = await validateAndCleanCart(cart)
    res.status(200).json(cart)
  } catch (error) {
    console.error('❌ [Cart] Fetch error:', error)
    res.status(500).json({ message: 'CART_FETCH_ERR' })
  }
}

/**
 * Adds a product to the authenticated user's cart.
 * If it already exists, increments the quantity.
 */
export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id
    const { productId, size } = req.body

    if (!productId) {
      return res.status(400).json({ message: 'PROD_ID_REQ' })
    }

    let cart = await Cart.findOne({ userId: userId })

    if (!cart) {
      cart = new Cart({ userId: userId, items: [] })
    }

    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId && item.size === size
    )

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += 1
    } else {
      cart.items.push({ productId, size, quantity: 1 })
    }

    const updatedCart = await cart.save()
    res.status(200).json(updatedCart)
  } catch (error) {
    console.error('❌ [Cart] Add item error:', error)
    res.status(500).json({ message: 'CART_ADD_ERR' })
  }
}

/**
 * Merges a temporary Guest cart into an Authenticated User's cart
 * immediately after the user logs in or registers.
 */
export const mergeCarts = async (req, res) => {
  try {
    const userId = req.user._id
    const { guestCartId } = req.body

    if (!guestCartId) {
      return res.status(400).json({ message: 'CART_ID_REQ' })
    }

    const userCart = await Cart.findOne({ userId })
    let guestCart = await Cart.findById(guestCartId)

    if (!guestCart) {
      return res.status(404).json({ message: 'CART_NOT_FOUND' })
    }

    // Prevent hijacking someone else's active user cart
    if (guestCart.userId) {
      console.warn(`⚠️ [Cart] Merge denied: Cart ${guestCartId} is already assigned to a user.`)
      return res.status(400).json({ message: 'CART_MERGE_DENIED' })
    }

    // Clean guest cart of deleted products before merging
    guestCart = await validateAndCleanCart(guestCart)

    // If the user doesn't have an existing cart, simply claim the guest cart
    if (!userCart) {
      guestCart.userId = userId
      const updatedCart = await guestCart.save()
      console.log(`✅ [Cart] Guest cart ${guestCartId} claimed by user ${userId}`)
      return res.status(200).json(updatedCart)
    }

    // If the user DOES have a cart, merge the items
    for (const guestItem of guestCart.items) {
      const existingItemIndex = userCart.items.findIndex(
        item => item.productId === guestItem.productId && item.size === guestItem.size
      )

      if (existingItemIndex > -1) {
        userCart.items[existingItemIndex].quantity += guestItem.quantity
      } else {
        userCart.items.push(guestItem)
      }
    }

    const updatedUserCart = await userCart.save()

    // Delete the now-obsolete guest cart
    await Cart.findByIdAndDelete(guestCartId)
    console.log(`✅ [Cart] Guest cart ${guestCartId} merged and deleted.`)

    res.status(200).json(updatedUserCart)
  } catch (error) {
    console.error('❌ [Cart] Merge error:', error)
    res.status(500).json({ message: 'CART_MERGE_ERR' })
  }
}

// ==========================================
// 👻 GUEST ROUTES (PUBLIC)
// ==========================================

/**
 * Fetches an anonymous cart by ID. Cleans obsolete products automatically.
 */
export const getGuestCart = async (req, res) => {
  try {
    const { cartId } = req.body

    if (!cartId) {
      return res.status(400).json({ message: 'CART_ID_REQ' })
    }

    let cart = await Cart.findById(cartId)

    if (!cart) {
      return res.status(404).json({ message: 'CART_NOT_FOUND' })
    }

    // Ensure an anonymous user isn't fetching an authenticated user's cart
    if (cart.userId) {
      console.warn(`⚠️ [Cart] Access denied: Guest tried to fetch assigned user cart ${cartId}`)
      return res.status(403).json({ message: 'CART_USER_ACCESS_DENIED' })
    }

    cart = await validateAndCleanCart(cart)
    res.status(200).json(cart)
  } catch (error) {
    console.error('❌ [Cart] Guest fetch error:', error)
    res.status(500).json({ message: 'CART_FETCH_ERR' })
  }
}

/**
 * Adds an item to an anonymous cart.
 * Creates a new cart if a valid ID isn't provided.
 */
export const addOrUpdateGuestCart = async (req, res) => {
  try {
    const { productId, size, cartId } = req.body

    if (!productId) {
      return res.status(400).json({ message: 'PROD_ID_REQ' })
    }

    let cart

    // Try to load existing unassigned cart, otherwise build a fresh one
    if (cartId) {
      cart = await Cart.findById(cartId)
      if (!cart || cart.userId) {
        cart = new Cart({ userId: null, items: [] })
      }
    } else {
      cart = new Cart({ userId: null, items: [] })
    }

    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId && item.size === size
    )

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += 1
    } else {
      cart.items.push({ productId, size, quantity: 1 })
    }

    const updatedCart = await cart.save()
    res.status(200).json(updatedCart)
  } catch (error) {
    console.error('❌ [Cart] Guest add/update error:', error)
    res.status(500).json({ message: 'CART_ADD_ERR' })
  }
}

// ==========================================
// 🔄 UNIVERSAL SHARED ROUTES (Auth or Guest)
// ==========================================

/**
 * Force-updates the quantity of a specific item inside the cart.
 */
export const updateItemQuantity = async (req, res) => {
  try {
    const userId = req.user?._id
    const { productId, size, newQuantity, cartId } = req.body

    if (!productId || newQuantity === undefined) {
      return res.status(400).json({ message: 'CART_QTY_ERR' })
    }

    if (newQuantity < 1) {
      return res.status(400).json({ message: 'CART_QTY_MIN' })
    }

    const cart = await findCart(userId, cartId)

    if (!cart) {
      return res.status(404).json({ message: 'CART_NOT_FOUND' })
    }

    const itemIndex = cart.items.findIndex(
      item => item.productId === productId && item.size === size
    )

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = newQuantity
      const updatedCart = await cart.save()
      return res.status(200).json(updatedCart)
    } else {
      return res.status(404).json({ message: 'CART_ITEM_NOT_FOUND' })
    }
  } catch (error) {
    console.error('❌ [Cart] Update quantity error:', error)
    res.status(500).json({ message: 'CART_UPDATE_QTY_ERR' })
  }
}

/**
 * Removes a specific item from the cart entirely.
 */
export const removeItem = async (req, res) => {
  try {
    const userId = req.user?._id
    const { productId, size, cartId } = req.body

    if (!productId) {
      return res.status(400).json({ message: 'PROD_ID_REQ' })
    }

    const cart = await findCart(userId, cartId)

    if (!cart) {
      return res.status(404).json({ message: 'CART_NOT_FOUND' })
    }

    const originalItemCount = cart.items.length
    cart.items = cart.items.filter(item => !(item.productId === productId && item.size === size))

    if (cart.items.length === originalItemCount) {
      return res.status(404).json({ message: 'CART_ITEM_NOT_FOUND' })
    }

    const updatedCart = await cart.save()
    res.status(200).json(updatedCart)
  } catch (error) {
    console.error('❌ [Cart] Remove item error:', error)
    res.status(500).json({ message: 'CART_REMOVE_ERR' })
  }
}

/**
 * Critical Checkout Gatekeeper: Verifies that every item in the cart
 * actually has enough physical stock left in the database.
 */
export const verifyStock = async (req, res) => {
  try {
    const userId = req.user?._id
    const { cartId, locale } = req.body

    if (!locale) {
      return res.status(400).json({ message: 'LOCALE_REQ' })
    }

    const cart = await findCart(userId, cartId)

    if (!cart) {
      return res.status(404).json({ message: 'CART_NOT_FOUND' })
    }

    if (cart.items.length === 0) {
      return res.status(400).json({ message: 'CART_EMPTY' })
    }

    for (const item of cart.items) {
      const product = await Product.findOne({ id: item.productId })

      // Edge Case: Product deleted while user was filling out checkout forms
      if (!product) {
        return res.status(400).json({ message: 'STOCK_PROD_MISSING' })
      }

      // 🌟 REFACTOR: Stock logic now checks the ROOT of the product
      if (item.size) {
        const sizeObj = product.sizes?.find(s => s.size === item.size)

        if (!sizeObj) {
          return res.status(400).json({ message: 'STOCK_SIZE_ERR' })
        }

        if (item.quantity > sizeObj.qty) {
          console.warn(
            `⚠️ [Cart] Stock violation: Requested ${item.quantity} of ${item.size}, but only ${sizeObj.qty} left.`
          )
          return res.status(400).json({ message: 'STOCK_SIZE_EXCEEDED' })
        }
      } else {
        // Non-sized product stock check
        if (product.quantity != null && item.quantity > product.quantity) {
          console.warn(
            `⚠️ [Cart] Stock violation: Requested ${item.quantity}, but only ${product.quantity} left.`
          )
          return res.status(400).json({ message: 'STOCK_QTY_EXCEEDED' })
        }
      }
    }

    // Success: Everything is in stock
    res.status(200).json()
  } catch (error) {
    console.error('❌ [Cart] Stock verification error:', error)
    res.status(500).json({ message: 'CHECKOUT_FAIL' })
  }
}
