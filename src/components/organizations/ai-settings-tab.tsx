'use client'

import {
  AccessDeniedNotice,
  ADVANCED_USE_CASES,
  AISettingsHeader,
  CapabilityMatrixSection,
  CustomAgentOverridesSection,
  LoadingState,
  MobileSaveBar,
  PRIMARY_USE_CASES,
  UseCaseRoutingSection,
  WorkspaceDefaultsSection,
} from '@/components/organizations/ai-settings/sections'
import { ModelRouterCard } from '@/components/organizations/ai-settings/model-router-card'
import { useAISettingsPolicy } from '@/components/organizations/ai-settings/use-ai-settings-policy'

interface AISettingsTabProps {
  workspaceId: string
  currentUserRole?: string
  className?: string
}

export default function AISettingsTab({
  workspaceId,
  currentUserRole = 'member',
  className,
}: AISettingsTabProps) {
  const canManageSettings = currentUserRole === 'admin' || currentUserRole === 'owner'
  const {
    isLoading,
    isSaving,
    policy,
    customAgents,
    expandedPrompts,
    hasChanges,
    customizedUseCaseCount,
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
    reload,
  } = useAISettingsPolicy(workspaceId)

  if (!canManageSettings) {
    return <AccessDeniedNotice className={className} />
  }

  if (isLoading) {
    return <LoadingState className={className} />
  }

  const totalUseCases = PRIMARY_USE_CASES.length + ADVANCED_USE_CASES.length

  return (
    <div className={className}>
      <AISettingsHeader
        customizedUseCaseCount={customizedUseCaseCount}
        totalUseCases={totalUseCases}
        customAgentCount={customAgents.length}
        overrideCount={Object.keys(policy.agent_profiles ?? {}).length}
        toolCount={policy.allowed_tools.length}
        executionMode={policy.execution_mode}
        isSaving={isSaving}
        hasChanges={hasChanges}
        onSave={() => void savePolicy()}
      />

      <div className="space-y-6">
        <WorkspaceDefaultsSection policy={policy} updatePolicy={updatePolicy} />
        <ModelRouterCard policy={policy} updatePolicy={updatePolicy} />
        <CapabilityMatrixSection />
        <UseCaseRoutingSection
          title="Per-Use-Case Routing"
          description="Override provider, model, tools, and prompt instructions for each runtime path."
          useCases={PRIMARY_USE_CASES}
          policy={policy}
          expandedPrompts={expandedPrompts}
          toggleExpanded={toggleExpanded}
          updateUseCaseModel={updateUseCaseModel}
          updateUseCaseTools={updateUseCaseTools}
          updateUseCasePrompts={updateUseCasePrompts}
          updateUseCaseHandbooks={updateUseCaseHandbooks}
          toggleUseCaseTool={toggleUseCaseTool}
        />
        <UseCaseRoutingSection
          title="Advanced Runtime Profiles"
          description="Less frequently tuned flows that still participate in the same resolver."
          useCases={ADVANCED_USE_CASES}
          policy={policy}
          expandedPrompts={expandedPrompts}
          toggleExpanded={toggleExpanded}
          updateUseCaseModel={updateUseCaseModel}
          updateUseCaseTools={updateUseCaseTools}
          updateUseCasePrompts={updateUseCasePrompts}
          updateUseCaseHandbooks={updateUseCaseHandbooks}
          toggleUseCaseTool={toggleUseCaseTool}
        />
        <CustomAgentOverridesSection
          workspaceId={workspaceId}
          policy={policy}
          customAgents={customAgents}
          reload={reload}
          updateAgentProfile={updateAgentProfile}
          toggleAgentTool={toggleAgentTool}
        />
      </div>

      <MobileSaveBar
        hasChanges={hasChanges}
        customizedUseCaseCount={customizedUseCaseCount}
        isSaving={isSaving}
        onSave={() => void savePolicy()}
      />
    </div>
  )
}
