'use client'

import { create } from 'zustand'
import { CreateTaskModal } from '../components/create-task-modal'

interface CreateTaskState {
  isOpen: boolean
  defaultProjectId?: string
  defaultSection?: 'now' | 'next' | 'later' | 'waiting' | 'backlog'
  openTaskModal: (options?: {
    projectId?: string
    section?: 'now' | 'next' | 'later' | 'waiting' | 'backlog'
  }) => void
  closeTaskModal: () => void
}

export const useCreateTaskModal = create<CreateTaskState>((set) => ({
  isOpen: false,
  defaultProjectId: undefined,
  defaultSection: 'backlog',
  
  openTaskModal: (options) => set({
    isOpen: true,
    defaultProjectId: options?.projectId,
    defaultSection: options?.section || 'backlog',
  }),
  
  closeTaskModal: () => set({ isOpen: false }),
}))

// Global component that renders the modal
export function CreateTaskModalProvider() {
  const { isOpen, closeTaskModal, defaultProjectId, defaultSection } = useCreateTaskModal()

  return (
    <CreateTaskModal
      isOpen={isOpen}
      onClose={closeTaskModal}
      defaultProjectId={defaultProjectId}
      defaultSection={defaultSection}
    />
  )
}
