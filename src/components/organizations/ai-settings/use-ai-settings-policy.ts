'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { AIUseCase, WorkspaceAIPolicy } from '@/lib/ai/policy'
import { ADVANCED_USE_CASES, PRIMARY_USE_CASES } from './constants'
import { cloneDefaultPolicy, mergePolicy, splitList, type CustomAgentSummary } from './utils'

export function useAISettingsPolicy(workspaceId: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [policy, setPolicy] = useState<WorkspaceAIPolicy>(cloneDefaultPolicy())
  const [originalPolicy, setOriginalPolicy] = useState<WorkspaceAIPolicy>(cloneDefaultPolicy())
  const [expandedPrompts, setExpandedPrompts] = useState<string[]>(['workspace-defaults', 'task_action'])
  const [customAgents, setCustomAgents] = useState<CustomAgentSummary[]>([])

  const allUseCases = useMemo(
    () => [...PRIMARY_USE_CASES, ...ADVANCED_USE_CASES],
    [],
  )

  const customizedUseCaseCount = useMemo(
    () =>
      allUseCases.filter((useCase) => {
        const model = policy.model_profiles?.[useCase.id]
        const tools = policy.tool_profiles?.[useCase.id]
        const prompts = policy.prompt_profiles?.[useCase.id]
        const handbooks = policy.skills_policy?.use_case_handbooks?.[useCase.id]
        return Boolean(
          model?.provider ||
          model?.model ||
          model?.fallback_chain?.length ||
          tools?.tool_mode ||
          tools?.allowed_tools?.length ||
          prompts?.system_instructions ||
          prompts?.prompt_instructions ||
          prompts?.handbook_slugs?.length ||
          handbooks?.length,
        )
      }).length,
    [allUseCases, policy],
  )

  const hasChanges = JSON.stringify(policy) !== JSON.stringify(originalPolicy)

  const loadPolicy = useCallback(async () => {
    try {
      setIsLoading(true)
      const [policyResponse, agentResponse] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/ai-policy`),
        fetch(`/api/agents/custom?workspace_id=${workspaceId}`),
      ])

      if (policyResponse.ok) {
        const data = await policyResponse.json()
        if (data.ok && data.data) {
          const merged = mergePolicy(data.data)
          setPolicy(merged)
          setOriginalPolicy(merged)
        }
      }

      if (agentResponse.ok) {
        const agentJson = await agentResponse.json()
        const items = (agentJson?.data?.items ?? []) as CustomAgentSummary[]
        setCustomAgents(Array.isArray(items) ? items : [])
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error)
      toast.error('Failed to load AI settings')
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    void loadPolicy()
  }, [loadPolicy])

  const savePolicy = useCallback(async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/ai-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      })

      const data = await response.json()
      if (response.ok && data.ok && data.data) {
        const merged = mergePolicy(data.data)
        setPolicy(merged)
        setOriginalPolicy(merged)
        toast.success('AI settings saved successfully')
        return true
      }

      toast.error(data.error?.message || 'Failed to save AI settings')
      return false
    } catch (error) {
      console.error('Failed to save AI policy:', error)
      toast.error('Failed to save AI settings')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [policy, workspaceId])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedPrompts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }, [])

  const updatePolicy = useCallback((updater: (prev: WorkspaceAIPolicy) => WorkspaceAIPolicy) => {
    setPolicy((prev) => mergePolicy(updater(prev)))
  }, [])

  const updateUseCaseModel = useCallback((useCase: AIUseCase, patch: Record<string, unknown>) => {
    updatePolicy((prev) => ({
      ...prev,
      model_profiles: {
        ...(prev.model_profiles ?? {}),
        [useCase]: {
          ...(prev.model_profiles?.[useCase] ?? {}),
          ...patch,
        },
      },
    }))
  }, [updatePolicy])

  const updateUseCaseTools = useCallback((useCase: AIUseCase, patch: Record<string, unknown>) => {
    updatePolicy((prev) => ({
      ...prev,
      tool_profiles: {
        ...(prev.tool_profiles ?? {}),
        [useCase]: {
          ...(prev.tool_profiles?.[useCase] ?? {}),
          ...patch,
        },
      },
    }))
  }, [updatePolicy])

  const updateUseCasePrompts = useCallback((useCase: AIUseCase, patch: Record<string, unknown>) => {
    updatePolicy((prev) => ({
      ...prev,
      prompt_profiles: {
        ...(prev.prompt_profiles ?? {}),
        [useCase]: {
          ...(prev.prompt_profiles?.[useCase] ?? {}),
          ...patch,
        },
      },
    }))
  }, [updatePolicy])

  const updateUseCaseHandbooks = useCallback((useCase: AIUseCase, value: string) => {
    updatePolicy((prev) => ({
      ...prev,
      skills_policy: {
        ...(prev.skills_policy ?? {}),
        use_case_handbooks: {
          ...(prev.skills_policy?.use_case_handbooks ?? {}),
          [useCase]: splitList(value),
        },
      },
    }))
  }, [updatePolicy])

  const toggleUseCaseTool = useCallback((useCase: AIUseCase, toolId: string) => {
    updatePolicy((prev) => {
      const current = prev.tool_profiles?.[useCase]?.allowed_tools ?? []
      const next = current.includes(toolId)
        ? current.filter((id) => id !== toolId)
        : [...current, toolId]
      return {
        ...prev,
        tool_profiles: {
          ...(prev.tool_profiles ?? {}),
          [useCase]: {
            ...(prev.tool_profiles?.[useCase] ?? {}),
            allowed_tools: next,
          },
        },
      }
    })
  }, [updatePolicy])

  const updateAgentProfile = useCallback((agentId: string, patch: Record<string, unknown>) => {
    updatePolicy((prev) => ({
      ...prev,
      agent_profiles: {
        ...(prev.agent_profiles ?? {}),
        [agentId]: {
          ...(prev.agent_profiles?.[agentId] ?? {}),
          ...patch,
        },
      },
    }))
  }, [updatePolicy])

  const toggleAgentTool = useCallback((agentId: string, toolId: string) => {
    updatePolicy((prev) => {
      const current = prev.agent_profiles?.[agentId]?.allowed_tools ?? []
      const next = current.includes(toolId)
        ? current.filter((id) => id !== toolId)
        : [...current, toolId]

      return {
        ...prev,
        agent_profiles: {
          ...(prev.agent_profiles ?? {}),
          [agentId]: {
            ...(prev.agent_profiles?.[agentId] ?? {}),
            allowed_tools: next,
          },
        },
      }
    })
  }, [updatePolicy])

  return {
    isLoading,
    isSaving,
    policy,
    customAgents,
    expandedPrompts,
    hasChanges,
    customizedUseCaseCount,
    setExpandedPrompts,
    toggleExpanded,
    updatePolicy,
    updateUseCaseModel,
    updateUseCaseTools,
    updateUseCasePrompts,
    updateUseCaseHandbooks,
    toggleUseCaseTool,
    updateAgentProfile,
    toggleAgentTool,
    savePolicy,
    reload: loadPolicy,
  }
}
