const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      // ----------------------------------------------------
      // 🟢 PUBLIC ROUTES (Anyone can access)
      // ----------------------------------------------------
      {
        path: '',
        name: 'home',
        component: () => import('src/pages/HomePage.vue'),
        meta: { requiresAuth: false }
      },
      {
        path: 'category/:id',
        name: 'category',
        component: () => import('src/pages/CategoryPage.vue'),
        meta: { requiresAuth: false }
      },
      {
        path: 'seller/:id',
        name: 'seller',
        component: () => import('src/pages/SellerPage.vue'),
        meta: { requiresAuth: false }
      },
      {
        path: 'product/:id',
        name: 'product',
        component: () => import('src/pages/ProductPage.vue'),
        meta: { requiresAuth: false }
      },
      {
        path: 'cart',
        name: 'cart',
        component: () => import('src/pages/CartPage.vue'),
        meta: { requiresAuth: false }
      },
      {
        path: 'checkout',
        name: 'checkout',
        component: () => import('src/pages/CheckoutPage.vue'),
        meta: { requiresAuth: false }
      },
      {
        path: 'checkout/express/:id',
        name: 'checkout-digital',
        component: () => import('src/pages/CheckoutPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'order/multi',
        name: 'order-multi',
        component: () => import('src/pages/OrderPage.vue'),
        meta: { requiresAuth: false }
      },
      {
        path: 'order/:id',
        name: 'order',
        component: () => import('src/pages/OrderPage.vue'),
        meta: { requiresAuth: false }
      },
      {
        path: 'info',
        name: 'info',
        component: () => import('src/pages/InfoPage.vue'),
        meta: { requiresAuth: false }
      },

      // ----------------------------------------------------
      // 🟡 GUEST ROUTES (Only unauthenticated users)
      // ----------------------------------------------------
      {
        path: 'login',
        name: 'login',
        component: () => import('src/pages/LoginPage.vue'),
        meta: { requiresGuest: true }
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('src/pages/RegisterPage.vue'),
        meta: { requiresGuest: true }
      },

      // ----------------------------------------------------
      // 🔴 PROTECTED ROUTES (Requires Login / Role)
      // ----------------------------------------------------
      {
        path: 'profile',
        name: 'profile',
        component: () => import('src/pages/ProfilePage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'admin',
        alias: 'panel', // 🌟 NEW: /panel and /admin now load the exact same page!
        name: 'admin',
        component: () => import('src/pages/AdminPage.vue'),
        // 🌟 FIX: Changed from 'requiresAdmin' to a shared access flag
        meta: { requiresFullscreen: true, requiresPanelAccess: true }
      },

      // ----------------------------------------------------
      // 🟣 UTILITY / FULLSCREEN ROUTES
      // ----------------------------------------------------
      {
        path: 'activate',
        name: 'activate',
        component: () => import('src/pages/ActivatePage.vue'),
        meta: { requiresFullscreen: true }
      },
      {
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('src/pages/ResetPasswordPage.vue'),
        meta: { requiresFullscreen: true }
      },
      {
        path: 'network-error',
        name: 'network-error',
        component: () => import('src/pages/NetworkErrorPage.vue'),
        meta: { requiresFullscreen: true }
      },
      {
        path: '/shipping',
        component: () => import('src/pages/LegalPage.vue')
      },
      {
        path: '/faq',
        component: () => import('src/pages/LegalPage.vue')
      },
      {
        path: '/terms',
        component: () => import('src/pages/LegalPage.vue')
      },
      {
        path: '/privacy',
        component: () => import('src/pages/LegalPage.vue')
      },
      // ----------------------------------------------------
      // 404 CATCH-ALL
      // ----------------------------------------------------
      {
        path: ':catchAll(.*)*',
        name: 'error404',
        component: () => import('src/pages/ErrorPage.vue'),
        meta: { requiresFullscreen: true }
      }
    ]
  },

  // ----------------------------------------------------
  // 🚀 SYSTEM INSTALLER
  // ----------------------------------------------------
  {
    path: '/install',
    component: () => import('layouts/InstallLayout.vue')
  }
]

export default routes
