'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, Clock } from 'lucide-react'
import type { ReminderOption } from '../types/reminder.types'

interface ReminderPickerProps {
  onSelectReminder: (option: ReminderOption, customDate?: Date) => void
  onRemoveReminder?: () => void
  currentReminder?: Date
  dueDate?: Date
}

export function ReminderPicker({
  onSelectReminder,
  onRemoveReminder,
  currentReminder,
  dueDate,
}: ReminderPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customDate, setCustomDate] = useState<string>('')
  const [customTime, setCustomTime] = useState<string>('')

  const handleQuickReminder = (option: ReminderOption) => {
    onSelectReminder(option)
    setIsOpen(false)
  }

  const handleCustomReminder = () => {
    if (customDate && customTime) {
      const reminderDate = new Date(`${customDate}T${customTime}`)
      onSelectReminder('custom', reminderDate)
      setCustomDate('')
      setCustomTime('')
      setShowCustom(false)
      setIsOpen(false)
    }
  }

  const formatReminderDisplay = (date?: Date) => {
    if (!date) return 'Set reminder'
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `Reminder in ${days}d`
    } else if (hours > 0) {
      return `Reminder in ${hours}h`
    } else {
      return 'Reminder soon'
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          title="Set reminder for this task"
        >
          <Clock className="h-4 w-4" />
          {formatReminderDisplay(currentReminder)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Reminder Options</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!showCustom ? (
          <>
            <DropdownMenuItem onClick={() => handleQuickReminder('1hour')}>
              <Clock className="mr-2 h-4 w-4" />
              <span>1 hour before due date</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickReminder('1day')}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>1 day before due date</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCustom(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Custom date and time</span>
            </DropdownMenuItem>

            {currentReminder && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    onRemoveReminder?.()
                    setIsOpen(false)
                  }}
                  className="text-red-600"
                >
                  Remove reminder
                </DropdownMenuItem>
              </>
            )}
          </>
        ) : (
          <>
            <div className="space-y-2 p-2">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
              />

              <label className="text-sm font-medium">Time</label>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
              />

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCustom(false)
                    setCustomDate('')
                    setCustomTime('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCustomReminder}
                  disabled={!customDate || !customTime}
                  className="flex-1"
                >
                  Set
                </Button>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
