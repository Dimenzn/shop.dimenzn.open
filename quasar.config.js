import { defineConfig } from '#q-app/wrappers'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'

// 1. Determine the environment state
//const isLocalBuild = process.env.USE_DEV_ENV === 'true'
//const isDev = process.env.NODE_ENV !== 'production' || isLocalBuild

// 2. Load GLOBAL variables (Stripe, Cloudinary)
// const globalEnvFileName = isDev ? '.env.test' : '.env'
// dotenv.config({ path: path.resolve(__dirname, globalEnvFileName) })
// console.log(`🌍 [Frontend ENV] Global layer: ${globalEnvFileName}`)

// 2. ALWAYS load .env as the global base
dotenv.config({ path: path.resolve(__dirname, '.env') })
console.log(`🌍 [Frontend ENV] Global layer: .env`)

export default defineConfig(ctx => {
  // 3. Load MARKET variables ONLY for local Port 9000 dev server
  // Compiled builds (local or live) do NOT need this; Nginx handles routing.
  let parsedMarketEnv = {}
  if (ctx.dev) {
    const defaultEnv = '.env.test'
    parsedMarketEnv = dotenv.config({ path: path.resolve(__dirname, defaultEnv) }).parsed || {}
    console.log(`📦 [Frontend ENV] Dev Server layer: ${defaultEnv}`)
  }

  return {
    // ... [keep your boot, css, extras, build targets the same] ...
    // 3. Register the new identity boot file
    boot: ['i18n', 'axios', 'runtime-config', 'time-warp'],

    css: ['app.scss'],
    extras: ['fontawesome-v6', 'roboto-font', 'material-icons'],

    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20'
      },
      alias: {
        sharedDB: path.join(__dirname, './sampleDB')
      },

      vueRouterMode: 'history',

      // 4. THE MASTER ENV STRATEGY
      env: {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        TIME_WARP_ENABLED: process.env.FRONT_WARP === 'true',
        NODE_ENV: process.env.NODE_ENV || 'development',

        // 🌟 Read directly from .env.test during local dev!
        // But force it to be an empty string '' for production so Nginx can handle routing.
        BASE_URL_API: ctx.dev ? parsedMarketEnv.BASE_URL_API : '',

        // Inject any remaining market variables ONLY when running locally
        ...(ctx.dev ? parsedMarketEnv : {})
      },

      extendViteConf(viteConf) {
        if (ctx.prod) {
          viteConf.esbuild = viteConf.esbuild || {}
          viteConf.esbuild.drop = ['console', 'debugger']
        }
      },

      vitePlugins: [
        [
          '@intlify/unplugin-vue-i18n/vite',
          {
            // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
            // compositionOnly: false,

            // if you want to use named tokens in your Vue I18n messages, such as 'Hello {name}',
            // you need to set `runtimeOnly: false`
            // runtimeOnly: false,

            ssr: ctx.modeName === 'ssr',

            // you need to set i18n resource including paths !
            include: [fileURLToPath(new URL('./src/i18n', import.meta.url)) + '/**']
          }
        ],

        [
          'vite-plugin-checker',
          {
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{js,mjs,cjs,vue}"',
              useFlatConfig: true
            }
          },
          { server: false }
        ]
      ]
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      // https: true,
      open: false, // opens browser window automatically
      host: '0.0.0.0'
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: ['Notify', 'LoadingBar', 'Dialog', 'AppFullscreen', 'Meta', 'Loading']
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: ['shakeY', 'fadeInRightBig', 'fadeOutRightBig'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-service-worker',
    //   pwaServiceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    //   bexManifestFile: 'src-bex/manifest.json
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000, // The default port that the production server should use
      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render' // keep this as last one
      ],

      // extendPackageJson (json) {},
      // extendSSRWebserverConf (esbuildConf) {},

      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      pwa: false
      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!

      // pwaExtendGenerateSWOptions (cfg) {},
      // pwaExtendInjectManifestOptions (cfg) {}
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'GenerateSW' // 'GenerateSW' or 'InjectManifest'
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json',
      // extendManifestJson (json) {},
      // useCredentialsForManifestTag: true,
      // injectPwaMetaTags: false,
      // extendPWACustomSWConf (esbuildConf) {},
      // extendGenerateSWOptions (cfg) {},
      // extendInjectManifestOptions (cfg) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (esbuildConf) {},
      // extendElectronPreloadConf (esbuildConf) {},

      // extendPackageJson (json) {},

      // Electron preload scripts (if any) from /src-electron, WITHOUT file extension
      preloadScripts: ['electron-preload'],

      // specify the debugging port to use for the Electron app when running in development mode
      inspectPort: 5858,

      bundler: 'packager', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'dgearv2'
      }
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (esbuildConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: []
    }
  }
})
