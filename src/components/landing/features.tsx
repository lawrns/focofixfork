'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Mic,
  Kanban,
  Zap,
  Users,
  BarChart3,
  Shield,
} from 'lucide-react'

const features = [
  {
    icon: Mic,
    title: 'Voice Commands',
    description: 'Create tasks, update projects, and navigate your workspace using natural voice commands powered by AI.',
  },
  {
    icon: Kanban,
    title: 'Beautiful Kanban',
    description: 'Visualize your workflow with smooth drag-and-drop boards. Customizable columns and smart automations.',
  },
  {
    icon: Zap,
    title: 'Smart Automations',
    description: 'Automate repetitive tasks with powerful rules. Set triggers, conditions, and actions without code.',
  },
  {
    icon: Users,
    title: 'Real-time Collaboration',
    description: 'Work together seamlessly with live cursors, instant updates, and threaded comments.',
  },
  {
    icon: BarChart3,
    title: 'Insightful Analytics',
    description: 'Track progress with beautiful charts. Understand velocity, bottlenecks, and team performance.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with SSO, audit logs, and granular permissions. Your data is always protected.',
  },
]

export function Features() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <section className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold uppercase tracking-wider">
            Features
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Everything you need to ship faster
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Powerful features designed for modern teams. Simple enough for anyone, powerful enough for experts.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-primary-500/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
