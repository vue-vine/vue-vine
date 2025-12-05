export function setupEventsReceive(): void {
  try {
    // Main thread uses getJSContext() to receive messages from background thread
    const jsContext = lynx.getJSContext()

    // Listen for custom event type 'vue-vine-event'
    jsContext.addEventListener('vue-vine-event', (event) => {
      try {
        // Parse the message data
        const messageData = typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data

        if (messageData && messageData.handlerSign) {
          if (typeof globalThis.vueVineHandleEvent === 'function') {
            globalThis.vueVineHandleEvent({
              type: 'vue-vine-event',
              handlerSign: messageData.handlerSign,
              eventData: messageData.eventData,
            })
          }
        }
      }
      catch (e) {
        console.error('[Vue Vine Lynx] Error handling received event:', e)
      }
    })
  }
  catch (e) {
    console.error('[Vue Vine Lynx] Failed to setup message listener:', e)
  }
}
