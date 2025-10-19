'use client'

interface FocoPushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

class PushManager {
  private subscription: PushSubscription | null = null
  private isSupported: boolean = false
  private permissionStatus: NotificationPermission = 'default'

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window
      this.permissionStatus = Notification.permission
      this.loadSubscription()
    }
  }

  private async loadSubscription() {
    if (!this.isSupported) return

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      this.subscription = subscription
    } catch (error) {
      console.error('[PushManager] Failed to load subscription:', error)
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported in this browser')
    }

    try {
      this.permissionStatus = await Notification.requestPermission()
      return this.permissionStatus
    } catch (error) {
      console.error('[PushManager] Failed to request permission:', error)
      throw error
    }
  }

  async subscribe(userId: string): Promise<FocoPushSubscription> {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported in this browser')
    }

    if (this.permissionStatus !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        )
      })

      this.subscription = subscription

      // Convert to our format and send to server
      const focoSubscription: FocoPushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : '',
          auth: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : ''
        }
      }
      
      await this.sendSubscriptionToServer(focoSubscription, userId)

      return focoSubscription
    } catch (error) {
      console.error('[PushManager] Failed to subscribe:', error)
      throw error
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) return false

    try {
      const success = await this.subscription.unsubscribe()
      if (success) {
        this.subscription = null
        await this.removeSubscriptionFromServer()
      }
      return success
    } catch (error) {
      console.error('[PushManager] Failed to unsubscribe:', error)
      return false
    }
  }

  private async sendSubscriptionToServer(subscription: FocoPushSubscription, userId: string) {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send subscription to server')
      }
    } catch (error) {
      console.error('[PushManager] Failed to send subscription to server:', error)
      throw error
    }
  }

  private async removeSubscriptionFromServer() {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('[PushManager] Failed to remove subscription from server:', error)
    }
  }

  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray.buffer
  }

  getSubscription(): FocoPushSubscription | null {
    if (!this.subscription) return null
    
    return {
      endpoint: this.subscription.endpoint,
      keys: {
        p256dh: this.subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(this.subscription.getKey('p256dh')!))) : '',
        auth: this.subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(this.subscription.getKey('auth')!))) : ''
      }
    }
  }

  isPermissionGranted(): boolean {
    return this.permissionStatus === 'granted'
  }

  isSubscribed(): boolean {
    return this.subscription !== null
  }

  getPermissionStatus(): NotificationPermission {
    return this.permissionStatus
  }

  getSupported(): boolean {
    return this.isSupported
  }
}

export const pushManager = new PushManager()
