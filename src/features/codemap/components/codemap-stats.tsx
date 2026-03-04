'use client';

import React from 'react';
import type { CodemapStats, CodemapEntryPoint } from '../types';

interface CodemapStatsCardProps {
  stats: CodemapStats;
  entryPoints: CodemapEntryPoint[];
  generatedAt: string;
  className?: string;
}

// Progress bar component
const ProgressBar: React.FC<{ 
  label: string; 
  value: number; 
  max: number; 
  color?: string 
}> = ({ label, value, max, color = 'bg-blue-500' }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">{value}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Stat card component
const StatCard: React.FC<{ 
  label: string; 
  value: string | number; 
  icon?: React.ReactNode;
  color?: string;
}> = ({ label, value, icon, color = 'bg-blue-50 text-blue-600' }) => {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center">
        {icon && (
          <div className={`p-2 rounded-lg ${color} mr-3`}>
            {icon}
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{value}</p>
        </div>
      </div>
    </div>
  );
};

// Pie chart component (simplified)
const LanguageBreakdown: React.FC<{ 
  byLanguage: Record<string, number>;
  totalFiles: number;
}> = ({ byLanguage, totalFiles }) => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-[color:var(--foco-teal)]',
    'bg-red-500',
    'bg-teal-500',
  ];

  const entries = Object.entries(byLanguage).sort((a, b) => b[1] - a[1]);
  const maxValue = Math.max(...entries.map(([, v]) => v));

  return (
    <div className="space-y-3">
      {entries.map(([lang, count], index) => (
        <ProgressBar
          key={lang}
          label={lang}
          value={count}
          max={maxValue}
          color={colors[index % colors.length]}
        />
      ))}
    </div>
  );
};

// Entry points summary
const EntryPointsSummary: React.FC<{ entryPoints: CodemapEntryPoint[] }> = ({ entryPoints }) => {
  const byType: Record<string, number> = {};
  for (const ep of entryPoints) {
    byType[ep.type] = (byType[ep.type] || 0) + 1;
  }

  const typeColors: Record<string, string> = {
    api: 'bg-green-100 text-green-800',
    page: 'bg-blue-100 text-blue-800',
    component: 'bg-purple-100 text-purple-800',
    lib: 'bg-yellow-100 text-yellow-800',
    config: 'bg-gray-100 text-gray-800',
    script: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(byType).map(([type, count]) => (
        <span 
          key={type}
          className={`px-3 py-1 rounded-full text-sm font-medium ${typeColors[type] || 'bg-gray-100 text-gray-800'}`}
        >
          {type}: {count}
        </span>
      ))}
    </div>
  );
};

// Main stats component
export const CodemapStatsCard: React.FC<CodemapStatsCardProps> = ({ 
  stats, 
  entryPoints,
  generatedAt,
  className = '' 
}) => {
  const generatedDate = new Date(generatedAt).toLocaleString();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Files"
          value={stats.totalFiles.toLocaleString()}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          label="Directories"
          value={stats.totalDirectories.toLocaleString()}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
          color="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
        />
        <StatCard
          label="Est. Lines of Code"
          value={(stats.totalFiles * 100).toLocaleString()}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          }
          color="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
      </div>

      {/* Language breakdown */}
      {Object.keys(stats.byLanguage).length > 0 && (
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">
            Language Breakdown
          </h4>
          <LanguageBreakdown 
            byLanguage={stats.byLanguage} 
            totalFiles={stats.totalFiles}
          />
        </div>
      )}

      {/* Entry points summary */}
      {entryPoints.length > 0 && (
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
            Entry Points ({entryPoints.length})
          </h4>
          <EntryPointsSummary entryPoints={entryPoints} />
        </div>
      )}

      {/* Generated timestamp */}
      <div className="text-xs text-gray-400 text-right">
        Generated: {generatedDate}
      </div>
    </div>
  );
};

export default CodemapStatsCard;
