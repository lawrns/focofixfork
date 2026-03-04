'use client'

import { Button } from '@/components/ui/button'

type MyWorkSection = 'now' | 'next' | 'later' | 'waiting'

interface MyWorkEmptyProps {
  section: MyWorkSection
  onAddTask: () => void
}

const sectionConfig: Record<MyWorkSection, {
  title: string
  buttonLabel: string
}> = {
  now: {
    title: 'No tasks in Now',
    buttonLabel: 'Add Task'
  },
  next: {
    title: 'No tasks in Next',
    buttonLabel: 'Add Task'
  },
  later: {
    title: 'No tasks in Later',
    buttonLabel: 'Add Task'
  },
  waiting: {
    title: 'No tasks in Waiting',
    buttonLabel: 'Add Task'
  }
}

export function MyWorkEmpty({ section, onAddTask }: MyWorkEmptyProps) {
  const config = sectionConfig[section]

  return (
    <div className="rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{config.title}</p>
        <Button size="sm" variant="outline" onClick={onAddTask}>
          {config.buttonLabel}
        </Button>
      </div>
    </div>
  )
}
