'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  }

  return (
    <section className="relative min-h-screen pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white dark:from-gray-950 to-gray-50 dark:to-gray-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />

      <motion.div
        className="relative max-w-7xl mx-auto px-6 flex flex-col items-center text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Announcement Badge */}
        <motion.div variants={itemVariants}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-500/10 dark:bg-primary-500/20 border border-primary-500/20 rounded-full hover:bg-primary-500/20 transition-colors cursor-pointer">
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              ✨ New: AI Voice Commands now available
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div variants={itemVariants} className="mt-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
            Transform Your Ideas into{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500">
              Beautiful Projects
            </span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl"
        >
          The AI-powered project management platform that helps teams move faster with voice commands and smart automation.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            variant="primary"
            size="lg"
            className="min-w-[180px] shadow-primary"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="min-w-[160px]"
          >
            <Play className="w-4 h-4 mr-2" />
            Watch Demo
          </Button>
        </motion.div>

        {/* Product Preview */}
        <motion.div
          variants={itemVariants}
          className="mt-16 lg:mt-24 max-w-6xl mx-auto w-full"
        >
          <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl dark:shadow-gray-950/50 overflow-hidden bg-gray-100 dark:bg-gray-900 aspect-[16/10]">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-purple-500/20 to-pink-500/20 blur-3xl scale-150" />
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-primary-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
