import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import webpush from 'web-push'

// Configure web-push only if keys are available
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@foco.mx',
    vapidPublicKey,
    vapidPrivateKey
  )
}

export async function POST(request: NextRequest) {
  try {
    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 503 }
      )
    }

    const { 
      userId, 
      title, 
      body, 
      icon, 
      badge, 
      tag, 
      data, 
      actions 
    } = await request.json()

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user's push subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No push subscription found for user' },
        { status: 404 }
      )
    }

    // Prepare push payload
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/manifest-icon-192.maskable.png',
      badge: badge || '/icons/manifest-icon-192.maskable.png',
      tag: tag || 'foco-notification',
      data: data || {},
      actions: actions || [],
      timestamp: Date.now()
    })

    // Send push notification
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key
      }
    }

    await webpush.sendNotification(pushSubscription, payload)

    // Log notification in database
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body,
        type: 'push',
        sent_at: new Date().toISOString(),
        metadata: {
          icon,
          badge,
          tag,
          data,
          actions
        }
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Send Notification] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
