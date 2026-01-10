'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Brain, Users, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/context'
import { SetupWizard, useSetupWizard } from '@/components/onboarding/setup-wizard'
import { useAuth } from '@/lib/hooks/use-auth'

export default function Home() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const { isOpen: isSetupOpen, startWizard, closeWizard, completeWizard, hasCompleted } = useSetupWizard()

  // Auto-start onboarding for authenticated users who haven't completed setup
  useEffect(() => {
    if (!loading && user && !hasCompleted) {
      const timer = setTimeout(() => {
        startWizard()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [loading, user, hasCompleted, startWizard])

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-zinc-100 z-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-zinc-900 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-semibold">F</span>
              </div>
              <span className="text-lg font-semibold text-zinc-900">Foco</span>
            </div>

            <div className="flex items-center gap-6">
              <Link href="#features" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors hidden sm:block">
                {t('homepage.features')}
              </Link>
              {!user ? (
                <Link href="/auth">
                  <Button variant="ghost" size="sm" className="text-zinc-600">
                    {t('homepage.login')}
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800">
                    {t('homepage.goToDashboard')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-semibold text-zinc-900 mb-4 tracking-tight">
            Voice-Powered Project Management
          </h1>
          <p className="text-lg text-zinc-600 mb-8 max-w-xl mx-auto">
            Speak your ideas. AI creates plans. Start managing projects the way you think.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-zinc-900 text-white hover:bg-zinc-800 px-6">
                  {t('homepage.goToDashboard')}
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button size="lg" className="bg-zinc-900 text-white hover:bg-zinc-800 px-6">
                  {t('homepage.getStarted')}
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Button>
              </Link>
            )}
            <Link href="/voice">
              <Button variant="outline" size="lg" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-6">
                See Demo
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900 mb-3">
              How it works
            </h2>
            <p className="text-zinc-600">
              From voice to plan in seconds
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Voice Capture */}
            <div className="bg-white border border-zinc-100 rounded-lg p-6">
              <div className="h-10 w-10 bg-zinc-100 rounded-lg flex items-center justify-center mb-4">
                <Mic className="h-5 w-5 text-zinc-700" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-medium text-zinc-900 mb-2">Voice Capture</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Speak naturally about your project. Our high-fidelity audio capture transcribes in real-time.
              </p>
            </div>

            {/* AI Planning */}
            <div className="bg-white border border-zinc-100 rounded-lg p-6">
              <div className="h-10 w-10 bg-zinc-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-5 w-5 text-zinc-700" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-medium text-zinc-900 mb-2">AI Planning</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                AI understands context, extracts requirements, and generates comprehensive project structures.
              </p>
            </div>

            {/* Team Collaboration */}
            <div className="bg-white border border-zinc-100 rounded-lg p-6">
              <div className="h-10 w-10 bg-zinc-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-5 w-5 text-zinc-700" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-medium text-zinc-900 mb-2">Team Collaboration</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Share plans with your team. Real-time updates keep everyone aligned and productive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900 mb-4">
            Ready to transform your workflow?
          </h2>
          <p className="text-zinc-600 mb-8">
            Start for free. No credit card required.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-zinc-900 text-white hover:bg-zinc-800 px-8">
              {t('homepage.getStartedNow')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-zinc-900 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-semibold">F</span>
            </div>
            <span className="text-sm font-medium text-zinc-900">Foco</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link href="#features" className="hover:text-zinc-900 transition-colors">
              {t('homepage.features')}
            </Link>
            <Link href="/voice" className="hover:text-zinc-900 transition-colors">
              Demo
            </Link>
          </div>

          <p className="text-sm text-zinc-500">
            © 2025 Foco
          </p>
        </div>
      </footer>

      {/* Setup Wizard */}
      <SetupWizard
        isOpen={isSetupOpen}
        onClose={closeWizard}
        onComplete={completeWizard}
      />
    </div>
  )
}
