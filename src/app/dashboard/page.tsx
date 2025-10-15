'use client'

import { useState } from 'react'

// TEMPORARY SIMPLE VERSION FOR TESTING
export default function DashboardPage() {
  const [testMessage, setTestMessage] = useState('Dashboard is working!')

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Foco Dashboard</h1>
        <p className="text-gray-600 mb-8">{testMessage}</p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">AI User Journey Testing</h2>
          <p className="text-gray-700 mb-4">
            Ready to test the workflows from the AI user journey context.
          </p>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => setTestMessage('Testing AI workflows...')}
          >
            Start AI Testing
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Workflow 1: Strategic Project Initialization</h3>
            <p className="text-sm text-gray-600">AI generates comprehensive project structure from natural language</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Workflow 2: Intelligent Daily Standup</h3>
            <p className="text-sm text-gray-600">AI analyzes activity and generates personalized talking points</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Workflow 3: Context-Aware Task Assistance</h3>
            <p className="text-sm text-gray-600">AI provides intelligent help based on task context</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Workflow 4: Automated Status Reporting</h3>
            <p className="text-sm text-gray-600">AI generates executive summaries and stakeholder reports</p>
          </div>
        </div>
      </div>
    </div>
  )
}


