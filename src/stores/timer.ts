import { defineStore } from 'pinia'

export const useTimerStore = defineStore('timer', {
  state: () => ({
    timers: {} as Record<string, NodeJS.Timeout>,
  }),

  actions: {
    setTimer(id: string, callback: () => void, interval: number) {
      this.clearTimer(id) // 避免重复定时器
      const timer = setInterval(callback, interval)
      this.timers[id] = timer
    },

    clearTimer(id: string) {
      if (this.timers[id]) {
        clearInterval(this.timers[id])
        delete this.timers[id]
      }
    },

    clearAllTimers() {
      Object.values(this.timers).forEach(clearInterval)
      this.timers = {}
    },
  },
})
