'use client'

import { BaseEmptyState } from './base-empty-state'
import Image from 'next/image'

type MyWorkSection = 'now' | 'next' | 'later' | 'waiting'

interface MyWorkEmptyProps {
  section: MyWorkSection
  onAddTask: () => void
}

const sectionConfig: Record<MyWorkSection, {
  title: string
  description: string
  imageSrc: string
  buttonLabel: string
}> = {
  now: {
    title: 'No urgent tasks',
    description: 'You\'re all caught up! Focus time is available for deep work, or add a new task to tackle now.',
    imageSrc: '/images/empty-states/my-work-now.png',
    buttonLabel: 'Add Task'
  },
  next: {
    title: 'Nothing queued up',
    description: 'Plan ahead by adding tasks you\'ll work on next. Stay organized and keep your momentum going.',
    imageSrc: '/images/empty-states/my-work-next.png',
    buttonLabel: 'Add Task'
  },
  later: {
    title: 'No backlog items',
    description: 'Your backlog is clear! Add future tasks or ideas here to keep track of what\'s coming down the line.',
    imageSrc: '/images/empty-states/my-work-later.png',
    buttonLabel: 'Add Task'
  },
  waiting: {
    title: 'Nothing on hold',
    description: 'Great! No tasks are blocked or waiting on others. Keep things moving forward.',
    imageSrc: '/images/empty-states/my-work-waiting.png',
    buttonLabel: 'Add Task'
  }
}

export function MyWorkEmpty({ section, onAddTask }: MyWorkEmptyProps) {
  const config = sectionConfig[section]

  const illustration = (
    <div className="relative w-full h-full">
      <Image
        src={config.imageSrc}
        alt={`${section} section empty state`}
        width={192}
        height={192}
        className="mx-auto dark:opacity-90"
        priority
      />
    </div>
  )

  return (
    <BaseEmptyState
      title={config.title}
      description={config.description}
      illustration={illustration}
      primaryAction={{
        label: config.buttonLabel,
        onClick: onAddTask,
        variant: 'default'
      }}
    />
  )
}
