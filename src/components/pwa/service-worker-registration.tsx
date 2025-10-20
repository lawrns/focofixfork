'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Gate registration behind environment variable
      if (process.env.NEXT_PUBLIC_SW_ENABLED !== 'false') {
        registerServiceWorker()
      } else {
        // When disabled, unregister any existing service workers
        unregisterServiceWorker()
      }
    }
  }, [])

  return null
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    console.log('[SW] Service Worker registered successfully:', registration.scope)

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            console.log('[SW] New service worker available')
            showUpdateNotification()
          }
        })
      }
    })

    // Handle controller change (when new SW takes control)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Service worker controller changed')
      // Reload to get the latest version
      window.location.reload()
    })

  } catch (error) {
    console.error('[SW] Service Worker registration failed:', error)
  }
}

function showUpdateNotification() {
  // Create a simple notification for the user
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Foco Update Available', {
      body: 'A new version is available. Click to update.',
      icon: '/icons/manifest-icon-192.maskable.png',
      tag: 'foco-update'
    })
  }

  // Also show a banner notification
  const banner = document.createElement('div')
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #0052CC;
    color: white;
    padding: 12px;
    text-align: center;
    z-index: 9999;
    font-family: system-ui, sans-serif;
  `
  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
      <span>New version available!</span>
      <button 
        onclick="window.location.reload()" 
        style="background: white; color: #0052CC; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 500;"
      >
        Update Now
      </button>
      <button 
        onclick="this.parentElement.parentElement.remove()" 
        style="background: transparent; color: white; border: 1px solid white; padding: 6px 12px; border-radius: 4px; cursor: pointer;"
      >
        Later
      </button>
    </div>
  `
  
  document.body.appendChild(banner)
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (banner.parentElement) {
      banner.remove()
    }
  }, 10000)
}

// Service Worker utilities
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister()
        console.log('[SW] Service Worker unregistered')
      })
    })
  }
}

export function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration) {
        registration.update()
        console.log('[SW] Service Worker update triggered')
      }
    })
  }
}

export function getServiceWorkerStatus(): Promise<{
  isSupported: boolean
  isRegistered: boolean
  isControlling: boolean
  scope?: string
}> {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator)) {
      resolve({
        isSupported: false,
        isRegistered: false,
        isControlling: false
      })
      return
    }

    navigator.serviceWorker.getRegistration().then(registration => {
      resolve({
        isSupported: true,
        isRegistered: !!registration,
        isControlling: !!navigator.serviceWorker.controller,
        scope: registration?.scope
      })
    })
  })
}
