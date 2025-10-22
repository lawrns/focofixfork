'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Flag, Users, Check, Download, Smartphone, Sparkles, Zap, Target, Brain, Calendar, BarChart3, MessageSquare, Shield, Clock, TrendingUp, Play, Star, ChevronRight, X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/context'
import { LanguageSelectorCompact } from '@/components/ui/language-selector'
import { SetupWizard, useSetupWizard } from '@/components/onboarding/setup-wizard'
import { useAuth } from '@/lib/hooks/use-auth'

export default function Home() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const { isOpen: isSetupOpen, startWizard, closeWizard, completeWizard, hasCompleted } = useSetupWizard()
  const [showDemo, setShowDemo] = useState(false)

  // Auto-start onboarding for authenticated users who haven't completed setup
  useEffect(() => {
    if (!loading && user && !hasCompleted) {
      const timer = setTimeout(() => {
        startWizard()
      }, 2000) // Delay to let the page load
      return () => clearTimeout(timer)
    }
  }, [loading, user, hasCompleted, startWizard])

  return (
    <div className="min-h-screen bg-white font-[Inter] overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb]" />
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
        <div className="absolute top-20 left-20 w-32 h-32 bg-[#0066FF]/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-40 right-20 w-24 h-24 bg-[#00D4AA]/10 rounded-full blur-lg animate-pulse" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-50 border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center hover:scale-105 transition-transform">
              <Image
                src="/focologo.png"
                alt="Foco Logo"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
                priority
                quality={100}
              />
              <span className="ml-3 text-xl font-bold text-gray-900">Foco</span>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSelectorCompact />
              <Link href="#features">
                <Button variant="ghost" className="hidden md:inline-flex text-[#404040] hover:text-[#0052CC] hover:bg-[#0052CC]/5">
                  {t('homepage.features')}
                </Button>
              </Link>
              <Link href="#pricing">
                <Button variant="ghost" className="hidden md:inline-flex text-[#404040] hover:text-[#0052CC] hover:bg-[#0052CC]/5">
                  {t('homepage.pricing')}
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="text-[#404040] hover:text-[#0052CC] hover:bg-[#0052CC]/5">
                  {t('homepage.login')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50/30"></div>
        <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,rgba(59,130,246,0.1)_0px,transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(at_100%_100%,rgba(168,85,247,0.08)_0px,transparent_50%)]"></div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column */}
            <div className="animate-fade-in">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 sm:mb-8 text-[#0A0A0A] leading-[1.1] tracking-tight">
                {t('homepage.title').split(' ').map((word, index) => (
                  word === 'matters' || word === 'importa' ? (
                    <span key={index} className="bg-gradient-to-r from-[#0052CC] to-[#667eea] bg-clip-text text-transparent">
                      {word}{' '}
                    </span>
                  ) : (
                    <span key={index}>{word}{' '}</span>
                  )
                ))}
              </h1>

              <p 
                className="text-lg sm:text-xl md:text-2xl text-[#404040] leading-relaxed mb-8 sm:mb-12 max-w-xl"
                dangerouslySetInnerHTML={{ __html: t('homepage.subtitle') }}
              />

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {user ? (
                  <div className="w-full sm:w-auto hover:scale-105 transition-transform">
                    <Link href="/dashboard">
                      <Button className="w-full sm:w-auto bg-[#0052CC] hover:bg-[#004299] text-white px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-semibold text-lg sm:text-xl shadow-[0_4px_16px_rgba(0,82,204,0.2)] hover:shadow-[0_6px_20px_rgba(0,82,204,0.25)] transition-all duration-400 min-h-[56px]">
                        {t('homepage.goToDashboard')}
                        <ArrowRight className="ml-2 sm:ml-3 w-5 h-5 sm:w-6 sm:h-6" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="w-full sm:w-auto hover:scale-105 transition-transform">
                    <Link href="/register">
                      <Button className="w-full sm:w-auto bg-[#0052CC] hover:bg-[#004299] text-white px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-semibold text-lg sm:text-xl shadow-[0_4px_16px_rgba(0,82,204,0.2)] hover:shadow-[0_6px_20px_rgba(0,82,204,0.25)] transition-all duration-400 min-h-[56px]">
                        {t('homepage.getStarted')}
                        <ArrowRight className="ml-2 sm:ml-3 w-5 h-5 sm:w-6 sm:h-6" />
                      </Button>
                    </Link>
                  </div>
                )}

                <div className="w-full sm:w-auto hover:scale-105 transition-transform">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDemo(true)}
                    className="w-full sm:w-auto border-2 border-[#E5E5E5] hover:border-[#6B6B6B] text-[#404040] hover:text-[#0A0A0A] bg-white hover:bg-[#F8F9FA] px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-semibold text-lg sm:text-xl transition-all duration-400 min-h-[56px]"
                  >
                    <Play className="mr-2 w-5 h-5" />
                    {t('homepage.watchDemo')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column - Video */}
            <div className="relative order-first lg:order-last animate-fade-in">
              <div className="relative backdrop-blur-sm bg-white/90 border border-black/8 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)] mx-auto hover:-translate-y-1 transition-transform" style={{ maxWidth: 'calc(100% - 20px)' }}>
                <div className="relative bg-[#0A0A0A] overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <video className="w-full h-full object-cover" controls preload="metadata" playsInline poster="/video/introo.mp4">
                    <source src="/video/introo.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0052CC]/5 via-transparent to-[#00B894]/5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section id="features" className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-[#FAFAFA]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-6">
              Everything you need to manage projects
            </h2>
            <p className="text-lg text-[#404040] max-w-2xl mx-auto">
              Powerful features designed to streamline your workflow and boost team productivity
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI-Powered Insights */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300">
              <div className="w-12 h-12 bg-[#0052CC]/10 rounded-xl flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-[#0052CC]" />
              </div>
              <h3 className="text-xl font-bold text-[#0A0A0A] mb-4">AI-Powered Insights</h3>
              <p className="text-[#404040] leading-relaxed">
                Get intelligent recommendations, automatic timeline adjustments, and predictive analytics to keep your projects on track.
              </p>
            </div>

            {/* Real-time Collaboration */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300">
              <div className="w-12 h-12 bg-[#00B894]/10 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6 text-[#00B894]" />
              </div>
              <h3 className="text-xl font-bold text-[#0A0A0A] mb-4">Real-time Collaboration</h3>
              <p className="text-[#404040] leading-relaxed">
                Chat, comment, and collaborate seamlessly with your team. Never miss important updates or lose context.
              </p>
            </div>

            {/* Advanced Analytics */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300">
              <div className="w-12 h-12 bg-[#FF6B6B]/10 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-[#FF6B6B]" />
              </div>
              <h3 className="text-xl font-bold text-[#0A0A0A] mb-4">Advanced Analytics</h3>
              <p className="text-[#404040] leading-relaxed">
                Track progress, identify bottlenecks, and make data-driven decisions with comprehensive project analytics.
              </p>
            </div>

            {/* Smart Scheduling */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300">
              <div className="w-12 h-12 bg-[#4ECDC4]/10 rounded-xl flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6 text-[#4ECDC4]" />
              </div>
              <h3 className="text-xl font-bold text-[#0A0A0A] mb-4">Smart Scheduling</h3>
              <p className="text-[#404040] leading-relaxed">
                Automatically adjust timelines based on team capacity, dependencies, and historical data.
              </p>
            </div>

            {/* Team Management */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300">
              <div className="w-12 h-12 bg-[#45B7D1]/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-[#45B7D1]" />
              </div>
              <h3 className="text-xl font-bold text-[#0A0A0A] mb-4">Team Management</h3>
              <p className="text-[#404040] leading-relaxed">
                Organize your team with roles, permissions, and workload distribution. Keep everyone aligned and productive.
              </p>
            </div>

            {/* Security & Compliance */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300">
              <div className="w-12 h-12 bg-[#96CEB4]/10 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-[#96CEB4]" />
              </div>
              <h3 className="text-xl font-bold text-[#0A0A0A] mb-4">Security & Compliance</h3>
              <p className="text-[#404040] leading-relaxed">
                Enterprise-grade security with role-based access control, audit logs, and compliance features.
              </p>
            </div>
          </div>

          {/* Key Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-[#0052CC] mb-2">50%</div>
              <div className="text-sm text-[#404040]">Faster project delivery</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-[#00B894] mb-2">90%</div>
              <div className="text-sm text-[#404040]">Reduction in missed deadlines</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-[#FF6B6B] mb-2">75%</div>
              <div className="text-sm text-[#404040]">Less time on admin tasks</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-[#4ECDC4] mb-2">100%</div>
              <div className="text-sm text-[#404040]">Free forever</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAFAFA] to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-[#0A0A0A] mb-6">
              {t('homepage.simplePricing')}
            </h2>
            <p 
              className="text-xl text-[#404040] max-w-2xl mx-auto"
              dangerouslySetInnerHTML={{ __html: t('homepage.simplePricingDesc') }}
            />
          </div>

          <div className="max-w-lg mx-auto hover:-translate-y-1 transition-transform">
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#E5E5E5]">
              <div className="bg-[#0052CC] text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
                {t('homepage.freeForever')}
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-[#0A0A0A] mb-4">{t('homepage.focoPro')}</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-bold text-[#0052CC]">$0</span>
                  <span className="text-[#6B6B6B] text-xl">{t('homepage.perMonth')}</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  t('homepage.unlimitedProjects'),
                  t('homepage.unlimitedTeamMembers'),
                  t('homepage.integratedAI'),
                  t('homepage.realtimeCollaboration'),
                  t('homepage.advancedAnalytics'),
                  t('homepage.prioritySupport'),
                  t('homepage.automaticUpdates')
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-[#0052CC] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[#404040] font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="hover:scale-105 transition-transform">
                <Link href="/register">
                  <Button className="w-full bg-[#0052CC] hover:bg-[#004299] text-white py-4 rounded-xl font-semibold text-lg shadow-[0_4px_16px_rgba(0,82,204,0.2)] hover:shadow-[0_6px_20px_rgba(0,82,204,0.25)] transition-all duration-400">
                    {t('homepage.getStartedNow')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-[#F8F9FA]">
        <div className="relative max-w-5xl mx-auto text-center">
          <h2 className="text-4xl lg:text-6xl font-bold text-[#0A0A0A] mb-8 leading-tight tracking-tight">
            {t('homepage.readyToRevolutionize')}
          </h2>

          <p className="text-xl text-[#404040] mb-12 max-w-3xl mx-auto leading-relaxed">
            {t('homepage.joinThousands')}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <div className="hover:scale-105 transition-transform">
              <Link href="/register">
                <Button className="bg-[#0052CC] hover:bg-[#004299] text-white px-12 py-5 rounded-xl font-semibold text-lg shadow-[0_4px_16px_rgba(0,82,204,0.2)] hover:shadow-[0_6px_20px_rgba(0,82,204,0.25)] transition-all duration-400">
                  {t('homepage.getStartedFree')}
                </Button>
              </Link>
            </div>

            <div className="hover:scale-105 transition-transform">
              <Link href="#demo">
                <Button variant="outline" className="border-2 border-[#6B6B6B] text-[#404040] hover:bg-[#F8F9FA] px-12 py-5 rounded-xl font-semibold text-lg transition-all duration-400">
                  {t('homepage.watchDemo')}
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-[#6B6B6B]">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#0052CC]" />
              <span>{t('homepage.noCreditCard')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#0052CC]" />
              <span>{t('homepage.setupInMinutes')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#0052CC]" />
              <span>{t('homepage.support247')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0A0A] py-16 px-4 sm:px-6 lg:px-8 border-t border-[#E5E5E5]/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <Image
                  src="/focologo.png"
                  alt="Foco Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                />
                <span className="ml-3 text-xl font-bold text-white">Foco</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">{t('homepage.product')}</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#features" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.features')}</a></li>
                <li><a href="#pricing" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.pricing')}</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.systemStatus')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">{t('homepage.company')}</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.about')}</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.blog')}</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.careers')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">{t('homepage.resources')}</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.helpCenter')}</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.community')}</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.apiDocs')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">{t('homepage.legal')}</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.privacy')}</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.terms')}</a></li>
                <li><a href="#" className="hover:text-[#0052CC] transition-colors duration-300">{t('homepage.security')}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center">
            <p 
              className="text-white/70"
              dangerouslySetInnerHTML={{ __html: t('homepage.copyright') }}
            />
            <div className="mt-4 flex items-center justify-center gap-6 text-sm text-white/50">
              <span>{t('homepage.developedWithPrecision')}</span>
              <span>•</span>
              <span>{t('homepage.aiIntegrated')}</span>
              <span>•</span>
              <span>{t('homepage.openSource')}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Setup Wizard */}
      <SetupWizard
        isOpen={isSetupOpen}
        onClose={closeWizard}
        onComplete={completeWizard}
      />

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">Foco Demo</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowDemo(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Demo video coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
