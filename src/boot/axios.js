import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'
import api from 'src/utils/api' // 🌟 IMPORT YOUR MASTER API INSTANCE

export default defineBoot(({ app }) => {
  // We keep this generic one just in case you ever need to hit an external API (like a weather service)
  app.config.globalProperties.$axios = axios

  // 🌟 Inject your custom, multi-tenant API instance globally!
  app.config.globalProperties.$api = api
})

export { api }
