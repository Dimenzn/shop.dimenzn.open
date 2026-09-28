import FakeTimers from '@sinonjs/fake-timers'

export const startTimeWarp = () => {
  if (process.env.TIME_WARP === 'true') {
    const SPEED_MULTIPLIER = parseInt(process.env.TIME_MULTIPLIER) || 3600

    // 1. Save the REAL setInterval
    const realSetInterval = setInterval

    // 2. Install Sinon
    const clock = FakeTimers.install({
      now: Date.now(),
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
      shouldClearNativeTimers: true // 🌟 ADD THIS LINE TO FIX THE WARNING!
    })

    // 3. Pump the FAKE clock
    const REAL_TICK_RATE = 100
    realSetInterval(() => {
      const fakeTimeToAdd = REAL_TICK_RATE * SPEED_MULTIPLIER
      clock.tick(fakeTimeToAdd)
    }, REAL_TICK_RATE)

    console.log(`\n🚀 ==========================================`)
    console.log(`⏱️  [WARNING] SINON TIME WARP ENABLED!`)
    console.log(`⏱️  Server running at ${SPEED_MULTIPLIER}x speed.`)
    console.log(`========================================== 🚀\n`)
  }
}
