'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          className="relative rounded-3xl bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 p-12 lg:p-16 text-center overflow-hidden"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {/* Glow effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_40%)]" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to transform your workflow?
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Join thousands of teams already using Foco to ship faster.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="default"
                size="lg"
                className="bg-white text-primary-600 hover:bg-gray-100"
              >
                Start Free Trial
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20"
              >
                Talk to Sales
              </Button>
            </div>

            <p className="mt-6 text-sm text-white/60">
              No credit card required • Free 14-day trial
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
