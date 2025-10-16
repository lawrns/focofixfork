'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, HelpCircle, X, Settings, LogOut, User } from 'lucide-react'
import { SavedViews } from '@/components/ui/saved-views'
import { ViewConfig } from '@/lib/hooks/use-saved-views'
import { useAuth } from '@/lib/hooks/use-auth'
import { useTranslation } from '@/lib/i18n/context'
import { apiGet } from '@/lib/api-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase-client'

interface SearchResult {
  id: string
  name: string
  type: 'project' | 'task' | 'milestone'
  description?: string
}

export default function Header() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { t } = useTranslation()

  // Debug: Force render user avatar even if user is null
  const displayUser = user || { email: 'test@example.com', user_metadata: { full_name: 'Test User' } }
  const avatarText = displayUser?.email?.charAt(0).toUpperCase() || 'U'

  console.log('Header component rendering:', { user: !!user, loading, displayUser: displayUser?.email })

  // TEMPORARY: Just return simple text to test rendering
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      backgroundColor: 'red',
      color: 'white',
      padding: '20px',
      fontSize: '24px',
      fontWeight: 'bold',
      border: '5px solid yellow'
    }}>
      🚨 HEADER IS HERE 🚨 User: {displayUser?.email} 🚨 LOGOUT BUTTON SHOULD BE HERE 🚨
    </div>
  )
