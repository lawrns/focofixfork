'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface UserModelPreferences {
  defaultModel: string
  fallbackChain: string[]
  plannerModel: string | null
  executorModel: string | null
  reviewerModel: string | null
}

interface UserModelPreferencesState extends UserModelPreferences {
  setDefaultModel: (model: string) => void
  setFallbackAt: (index: number, model: string | null) => void
  setPlannerModel: (model: string | null) => void
  setExecutorModel: (model: string | null) => void
  setReviewerModel: (model: string | null) => void
  reset: () => void
}

const DEFAULT_PREFERENCES: UserModelPreferences = {
  defaultModel: 'glm-5',
  fallbackChain: ['claude-opus-4-6', 'glm-5'],
  plannerModel: null,
  executorModel: null,
  reviewerModel: null,
}

export const useUserModelPreferences = create<UserModelPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      setDefaultModel: (model) => set({ defaultModel: model }),
      setFallbackAt: (index, model) =>
        set((state) => {
          const next = [...state.fallbackChain]
          if (!model) {
            next.splice(index, 1)
          } else {
            next[index] = model
          }
          return {
            fallbackChain: next.filter(Boolean).slice(0, 3),
          }
        }),
      setPlannerModel: (plannerModel) => set({ plannerModel }),
      setExecutorModel: (executorModel) => set({ executorModel }),
      setReviewerModel: (reviewerModel) => set({ reviewerModel }),
      reset: () => set(DEFAULT_PREFERENCES),
    }),
    {
      name: 'foco_user_model_prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        defaultModel: state.defaultModel,
        fallbackChain: state.fallbackChain,
        plannerModel: state.plannerModel,
        executorModel: state.executorModel,
        reviewerModel: state.reviewerModel,
      }),
    }
  )
)
