// ==========================================
// 📧 1. WELCOME & ACTIVATION EMAIL
// ==========================================
export const getWelcomeTemplate = (customerName, companyName, activationLink, t) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee;">
      <h2 style="color: #1976D2;">${t.WELCOME_SUBJECT} ${companyName}! 🚀</h2>

      <p>${t.WELCOME_GREETING} <strong>${customerName}</strong>,</p>

      <p>${t.WELCOME_BODY_1}</p>
      <p>${t.WELCOME_BODY_3}</p>

      <br>

      <div style="text-align: center;">
        <a href="${activationLink}" style="background-color: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          ${t.WELCOME_BTN_1}
        </a>
      </div>

      <br><br>
      <p style="font-size: 12px; color: #999;">
        ${t.FOOTER_REGARDS}<br>${companyName} ${t.FOOTER_TEAM}
      </p>
    </div>
  `
}

// ==========================================
// 🔒 2. PASSWORD RESET EMAIL
// ==========================================
export const getResetPasswordTemplate = (customerName, companyName, resetLink, t) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee;">
      <h2 style="color: #1976D2;">${t.RESET_SUBJECT} 🔒</h2>

      <p>${t.RESET_GREETING} <strong>${customerName}</strong>,</p>

      <p>${t.RESET_BODY_1}</p>
      <p>${t.RESET_BODY_2}</p>

      <br>

      <div style="text-align: center;">
        <a href="${resetLink}" style="background-color: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          ${t.BTN_RESET}
        </a>
      </div>

      <br><br>
      <p style="font-size: 12px; color: #999;">
        ${t.FOOTER_REGARDS}<br>${companyName} ${t.FOOTER_TEAM}
      </p>
    </div>
  `
}

// ==========================================
// 🛒 3. BUYER ORDER CONFIRMATION
// ==========================================
export const getOrderConfirmationTemplate = (customerName, companyName, order, orderLink, t) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee;">
      <h2 style="color: #4CAF50;">${t.ORDER_SUBJECT} 🎉</h2>

      <p>${t.ORDER_GREETING} <strong>${customerName}</strong>,</p>

      <p>${t.ORDER_BODY_1}</p>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>${t.ORDER_NUMBER}:</strong> #${order._id}</p>
        <p style="margin: 0 0 10px 0;"><strong>${t.ORDER_TOTAL}:</strong> ${order.totalAmount.toFixed(2)} ${order.currency}</p>
      </div>

      <p>${t.ORDER_BODY_2}</p>

      <br>

      <div style="text-align: center;">
        <a href="${orderLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          ${t.BTN_VIEW_ORDER}
        </a>
      </div>

      <br><br>
      <p style="font-size: 12px; color: #999;">
        ${t.FOOTER_REGARDS}<br>${companyName} ${t.FOOTER_TEAM}
      </p>
    </div>
  `
}

// ==========================================
// 🚨 4. ADMIN ORDER NOTIFICATION
// ==========================================
export const getAdminOrderNotificationTemplate = (companyName, order, buyerEmail, adminLink, t) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 2px solid #1976D2;">
      <h2 style="color: #1976D2;">${t.ADMIN_ORDER_SUBJECT} 🔔</h2>

      <p>${t.ADMIN_ORDER_GREETING} <strong>${companyName}</strong>.</p>

      <div style="background-color: #f1f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>${t.LABEL_ORDER_ID}:</strong> #${order._id}</p>
        <p style="margin: 0 0 10px 0;"><strong>${t.LABEL_CUSTOMER}:</strong> ${buyerEmail}</p>
        <p style="margin: 0 0 10px 0;"><strong>${t.LABEL_TOTAL_VALUE}:</strong> ${order.totalAmount.toFixed(2)} ${order.currency}</p>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="${adminLink}" style="background-color: #1976D2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          ${t.BTN_VIEW_ADMIN}
        </a>
      </div>
    </div>
  `
}

// ==========================================
// 🏪 5. SELLER ORDER NOTIFICATION (NEW)
// ==========================================
/**
 * Generates the HTML notification sent to Sellers when their products are ordered.
 * Includes fallback strings in case the database language file doesn't have seller keys yet.
 */
export const getSellerOrderNotificationTemplate = (
  sellerName,
  companyName,
  order,
  sellerLink,
  t
) => {
  // Smart fallbacks to prevent crashes if 't' is undefined or missing keys
  const subject = t?.SELLER_ORDER_SUBJECT || 'New Sale! 🎉'
  const greeting = t?.SELLER_ORDER_GREETING || 'Great news'
  const body =
    t?.SELLER_ORDER_BODY ||
    'You have a new order to fulfill. Log in to your Seller panel to view the details and prepare the items for shipping.'
  const labelOrderId = t?.LABEL_ORDER_ID || 'Order ID'
  const btnText = t?.BTN_VIEW_SELLER || 'View in Seller Panel'
  const regards = t?.FOOTER_REGARDS || 'Best regards,'
  const team = t?.FOOTER_TEAM || 'Team'

  // 🌟 FIX: Extracted "Total Items" from the HTML and added it to the fallback system
  const labelTotalItems = t?.LABEL_TOTAL_ITEMS || 'Total Items'

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #9C27B0;">${subject}</h2>

      <p>${greeting} <strong>${sellerName}</strong>,</p>

      <p>${body}</p>

      <div style="background-color: #f3e5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>${labelOrderId}:</strong> #${order._id}</p>
        <p style="margin: 0 0 10px 0;"><strong>${labelTotalItems}:</strong> ${order.items.length}</p>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="${sellerLink}" style="background-color: #9C27B0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          ${btnText}
        </a>
      </div>

      <br><br>
      <p style="font-size: 12px; color: #999;">
        ${regards}<br>${companyName} ${team}
      </p>
    </div>
  `
}

// ==========================================
// 🔑 6. DIGITAL ORDER CONFIRMATION (NEW)
// ==========================================
export const getDigitalOrderConfirmationTemplate = (
  customerName,
  companyName,
  order,
  orderLink,
  t
) => {
  // Smart fallbacks in case the translation keys aren't in the DB yet
  const subject = t?.DIGITAL_ORDER_SUBJECT || 'Your Digital Key is Ready!'
  const greeting = t?.ORDER_GREETING || 'Hello'
  const body1 =
    t?.DIGITAL_ORDER_BODY_1 ||
    'Thank you for your purchase! Your digital activation key has been securely generated and is ready to use.'
  const labelKey = t?.LABEL_ACTIVATION_KEY || 'Activation Key'
  const btnText = t?.BTN_VIEW_PROFILE || 'View Your Account'
  const regards = t?.FOOTER_REGARDS || 'Best regards,'
  const team = t?.FOOTER_TEAM || 'Team'

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee;">
      <h2 style="color: #1976D2;">${subject} 🔑</h2>

      <p>${greeting} <strong>${customerName}</strong>,</p>

      <p>${body1}</p>

      <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 2px dashed #1976D2;">
        <p style="margin: 0 0 8px 0; color: #1976D2; text-transform: uppercase; font-size: 13px; font-weight: bold; letter-spacing: 1px;">
          ${labelKey}
        </p>
        <strong style="font-size: 26px; letter-spacing: 2px; color: #333;">${order.digitalKey}</strong>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${orderLink}" style="background-color: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          ${btnText}
        </a>
      </div>

      <br><br>
      <p style="font-size: 12px; color: #999;">
        ${regards}<br>${companyName} ${team}
      </p>
    </div>
  `
}
