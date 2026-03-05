import { n8nRequest } from '@/lib/n8n/client'
import type { WorkflowAugmentation, WorkflowProposalDraft } from './types'

function getWorkflowBody(proposal: WorkflowProposalDraft, selectedAddOns: WorkflowAugmentation[]) {
  const workflow = structuredClone(proposal.workflowJson) as Record<string, any>
  const nodes = Array.isArray(workflow.nodes) ? [...workflow.nodes] : []
  const connections = typeof workflow.connections === 'object' && workflow.connections ? { ...workflow.connections } : {}

  const rootNodeName = typeof nodes[0]?.name === 'string' ? nodes[0].name : null

  for (const addOn of selectedAddOns) {
    if (addOn.id === 'wait_backoff' && rootNodeName) {
      const waitName = 'Safety Wait'
      nodes.push({
        id: 'wait_backoff',
        name: waitName,
        type: 'n8n-nodes-base.wait',
        typeVersion: 1,
        position: [420, 120],
        parameters: { amount: 15, unit: 'seconds' },
      })
      const originalConnection = connections[rootNodeName]?.main?.[0]?.[0]
      if (originalConnection) {
        connections[rootNodeName] = { main: [[{ node: waitName, type: 'main', index: 0 }]] }
        connections[waitName] = { main: [[originalConnection]] }
      }
    }

    if (addOn.id === 'payload_snapshot' && rootNodeName) {
      const setName = 'Normalize Payload'
      nodes.push({
        id: 'payload_snapshot',
        name: setName,
        type: 'n8n-nodes-base.set',
        typeVersion: 3,
        position: [420, 390],
        parameters: {
          keepOnlySet: false,
          values: {
            string: [
              { name: 'projectContext', value: '={{$json.project ?? "project-workflow"}}' },
            ],
          },
        },
      })
      const originalConnection = connections[rootNodeName]?.main?.[0]?.[0]
      if (originalConnection) {
        connections[rootNodeName] = { main: [[{ node: setName, type: 'main', index: 0 }]] }
        connections[setName] = { main: [[originalConnection]] }
      }
    }

    if (addOn.id === 'callback_audit') {
      const callbackName = 'Callback Audit'
      nodes.push({
        id: 'callback_audit',
        name: callbackName,
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1160, 260],
        parameters: {
          method: 'POST',
          url: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/empire/n8n/callback` : 'http://127.0.0.1:4000/api/empire/n8n/callback',
          sendBody: true,
          contentType: 'json',
          jsonBody: '={{ { source: "project_workflow", workflow_id: $workflow.id, workflow_name: $workflow.name, payload: $json } }}',
        },
      })

      const terminalNodeNames = nodes
        .filter((node) => typeof node?.name === 'string')
        .map((node) => node.name as string)
        .filter((name) => {
          const connection = connections[name]
          return !connection?.main?.[0]?.length
        })

      for (const terminalName of terminalNodeNames) {
        connections[terminalName] = { main: [[{ node: callbackName, type: 'main', index: 0 }]] }
      }
    }
  }

  workflow.nodes = nodes
  workflow.connections = connections
  return workflow
}

export async function createDraftWorkflowFromProposal(
  proposal: WorkflowProposalDraft,
  selectedAddOns: WorkflowAugmentation[],
) {
  const workflow = getWorkflowBody(proposal, selectedAddOns)
  const tags = [
    { name: 'source:project_workflow' },
    { name: `template:${proposal.sourceTemplate.id}` },
    { name: `owner_agent:${proposal.ownerAgent}` },
    { name: `risk:${proposal.riskTier}` },
  ]

  return n8nRequest<Record<string, any>>('/api/v1/workflows', {
    method: 'POST',
    body: {
      ...workflow,
      active: false,
      tags,
    },
  })
}
