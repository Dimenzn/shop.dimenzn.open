export default async () => {
  // 🛑 SECURITY GUARD: Only run in Dev AND only if the terminal flag was passed!
  if (process.env.NODE_ENV === 'development' && process.env.TIME_WARP_ENABLED) {
    const SPEED_MULTIPLIER = 3600

    // In the browser, the global object is 'window'
    const OriginalDate = window.Date
    const startRealTime = OriginalDate.now()
    let startFakeTime = startRealTime // Fallback if the server request fails

    try {
      // 🌟 THE FIX: Ask the backend what time it is in the "Warped" timeline
      // Adjust this URL to match wherever you put the route in Step 1!
      const response = await fetch('http://localhost:5000/api/open/dev/time')

      if (response.ok) {
        const data = await response.json()
        startFakeTime = data.serverTime // Override with the server's warped time!
        console.log(`⏱️ Synced with Server Time!`)
      } else {
        console.warn(`⏱️ Failed to sync time with server, falling back to local time.`)
      }
    } catch {
      console.warn(`⏱️ Server unreachable for time sync, falling back to local time.`)
    }

    // Hijack the browser's native Date object
    window.Date = class extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          super(Date.now())
        } else {
          super(...args)
        }
      }

      static now() {
        // Calculate how much real time passed since the browser refreshed
        const realElapsed = OriginalDate.now() - startRealTime

        // Multiply it by our speed factor
        const fakeElapsed = realElapsed * SPEED_MULTIPLIER

        // Add it to the SERVER'S time, so they stay perfectly perfectly locked together
        return startFakeTime + fakeElapsed
      }
    }

    console.log(`\n🚀 ==========================================`)
    console.log(`⏱️  [WARNING] FRONTEND TIME WARP ENABLED!`)
    console.log(`⏱️  Browser running at ${SPEED_MULTIPLIER}x speed.`)
    console.log(`========================================== 🚀\n`)
  }
}
