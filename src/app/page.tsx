'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Flag, Users, Check, Download, Smartphone, Sparkles, Zap, Target, Brain, Calendar, BarChart3, MessageSquare, Shield, Clock, TrendingUp, Play, Star, ChevronRight, X, Mic, Globe, Activity } from 'lucide-react'
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
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 font-[Inter] overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-sm shadow-sm z-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-semibold text-slate-900">Foco</span>
              <div className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                Voice → Plan
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSelectorCompact />
              <Link href="/voice">
                <Button variant="ghost" className="hidden md:inline-flex text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                  <Mic className="w-4 h-4 mr-2" />
                  Voice Planning
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="ghost" className="hidden md:inline-flex text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                  {t('homepage.features')}
                </Button>
              </Link>
              <Link href="#pricing">
                <Button variant="ghost" className="hidden md:inline-flex text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                  {t('homepage.pricing')}
                </Button>
              </Link>
              {!user ? (
                <Link href="/auth">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                    {t('homepage.getStarted')}
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                    {t('homepage.dashboard')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          
          <div className="relative">
            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 mb-6">
              <Brain className="w-4 h-4 mr-2" />
              Voice-Powered Project Management
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Transform Ideas into
              <span className="text-emerald-600"> Projects</span>
              <br />with Your Voice
            </h1>
            
            <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Simply speak your project ideas and watch AI create complete project plans with tasks, timelines, and team assignments. 
              <span className="font-semibold text-emerald-600"> Completely free</span> —no limits, no credit cards required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {user ? (
                <div className="w-full sm:w-auto">
                  <Link href="/dashboard">
                    <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-10 py-4 rounded-xl">
                      <Mic className="w-5 h-5 mr-2" />
                      Go to Dashboard
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="w-full sm:w-auto">
                  <Link href="/register">
                    <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-10 py-4 rounded-xl">
                      <Mic className="w-5 h-5 mr-2" />
                      Start Voice Planning
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              )}

              <div className="w-full sm:w-auto">
                <Button 
                  onClick={() => setShowDemo(true)}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-lg px-10 py-4 rounded-xl"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-8 text-slate-500">
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <span>Setup in 2 minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Planning Feature */}
      <section id="voice" className="relative py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 mb-4">
              <Mic className="w-4 h-4 mr-2" />
              Voice-Powered Innovation
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Speak Your Ideas,
              <span className="text-emerald-600"> AI Creates</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Transform natural language into comprehensive project plans with intelligent task breakdown, timeline estimation, and team coordination—all powered by advanced AI.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="bg-white border border-slate-200 rounded-xl p-8 hover:shadow-md transition-shadow">
              <div className="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Mic className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Voice Capture</h3>
              <p className="text-slate-600 text-lg mb-4">
                High-fidelity audio capture with real-time transcription. Speak naturally in any language and watch your words transform into structured project data.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-700 text-sm">Multi-language support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-700 text-sm">Noise cancellation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-700 text-sm">Real-time processing</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-8 hover:shadow-md transition-shadow">
              <div className="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Brain className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">AI Intelligence</h3>
              <p className="text-slate-600 text-lg mb-4">
                Advanced GPT-4 integration understands context, extracts requirements, and generates comprehensive project structures with realistic timelines.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-700 text-sm">Context understanding</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-700 text-sm">Smart task breakdown</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-700 text-sm">Timeline estimation</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-8 hover:shadow-md transition-shadow">
              <div className="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Target className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Smart Planning</h3>
              <p className="text-slate-600 text-lg mb-4">
                Automatic task breakdown, dependency mapping, milestone creation, and team assignment based on project complexity and requirements.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-700 text-sm">Task decomposition</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-700 text-sm">Dependency mapping</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-700 text-sm">Resource allocation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Planning Workbench Showcase */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-slate-900 mb-4">Voice Planning Workbench</h3>
              <p className="text-slate-600 text-lg">The complete AI-powered project creation experience</p>
              <div className="flex items-center justify-center gap-4 mt-6">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">Real-time Audio Visualization</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">Drag & Drop Task Editing</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">Interactive Timeline Charts</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {/* Voice Capture Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Mic className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-slate-900">Voice Capture</h4>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-8 bg-emerald-500 rounded-full"></div>
                    <div className="h-1 w-6 bg-emerald-500 rounded-full"></div>
                    <div className="h-1 w-10 bg-emerald-500 rounded-full"></div>
                    <div className="h-1 w-4 bg-emerald-500 rounded-full"></div>
                    <div className="h-1 w-8 bg-emerald-500 rounded-full"></div>
                  </div>
                  <p className="text-slate-600 text-sm">Live audio visualizer with real-time transcription</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">10 weeks</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">2 devs</span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">iOS</span>
                </div>
              </div>

              {/* Plan Review Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Target className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-slate-900">Plan Review</h4>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="bg-white rounded-lg p-2 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-slate-700 text-sm">Auth & Accounts</span>
                      <span className="text-slate-500 text-xs ml-auto">3 tasks</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
                      <span className="text-slate-700 text-sm">Offline Sync</span>
                      <span className="text-slate-500 text-xs ml-auto">5 tasks</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                      <span className="text-slate-700 text-sm">Dashboard</span>
                      <span className="text-slate-500 text-xs ml-auto">4 tasks</span>
                    </div>
                  </div>
                </div>
                <p className="text-slate-600 text-sm">Drag & drop task reordering with priority badges</p>
              </div>

              {/* Timeline Visualization */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-slate-900">Timeline View</h4>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 bg-emerald-500 rounded" style={{width: '60%'}}></div>
                    <span className="text-slate-500 text-xs">12d</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 bg-emerald-400 rounded" style={{width: '45%'}}></div>
                    <span className="text-slate-500 text-xs">9d</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 bg-emerald-300 rounded" style={{width: '30%'}}></div>
                    <span className="text-slate-500 text-xs">6d</span>
                  </div>
                </div>
                <p className="text-slate-600 text-sm">Interactive Gantt charts with milestone tracking</p>
              </div>
            </div>

            {/* Quality Gates */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Activity className="h-4 w-4 text-emerald-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900">Quality Gates</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-700 text-sm">Transcription Confidence</span>
                    <span className="text-emerald-600 text-sm font-medium">78%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width: '78%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-700 text-sm">Intent Extraction</span>
                    <span className="text-emerald-600 text-sm font-medium">85%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width: '85%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-700 text-sm">Planning Latency p95</span>
                    <span className="text-emerald-600 text-sm font-medium">62%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width: '62%'}}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <Link href="/voice">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-10 py-4 rounded-xl">
                  <Mic className="w-5 h-5 mr-2" />
                  Experience Voice Planning Workbench
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <p className="text-slate-500 text-sm mt-4">Transform your ideas into actionable projects in seconds</p>
            </div>
          </div>
        </div>
      </section>

      {/* Design System Showcase */}
      <section className="relative py-24 px-6 bg-white/5">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-violet-500/20 to-purple-600/20 text-violet-200 border-violet-500/30 mb-4">
              <Sparkles className="w-4 h-4 mr-2" />
              Modern Design System
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Built with
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent"> Excellence</span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Our comprehensive design system ensures consistency, accessibility, and exceptional user experience across every interaction.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Voice-First Design Principles</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="h-8 w-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Mic className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-1">Natural Interactions</h4>
                    <p className="text-white/70">Voice interfaces that feel conversational and intuitive, reducing friction in project creation.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-1">AI-Augmented UX</h4>
                    <p className="text-white/70">Smart suggestions and predictive interfaces that anticipate user needs and streamline workflows.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-1">Goal-Oriented Design</h4>
                    <p className="text-white/70">Every element crafted to help users achieve their project management objectives efficiently.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl p-8">
              <h4 className="text-xl font-bold text-white mb-6">Design Tokens</h4>
              <div className="space-y-6">
                <div>
                  <h5 className="text-sm font-medium text-white/80 mb-3">Color Palette</h5>
                  <div className="grid grid-cols-6 gap-2">
                    <div className="h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg"></div>
                    <div className="h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg"></div>
                    <div className="h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg"></div>
                    <div className="h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg"></div>
                    <div className="h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg"></div>
                    <div className="h-12 bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg"></div>
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-white/80 mb-3">Typography Scale</h5>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-white">Heading 1</div>
                    <div className="text-2xl font-bold text-white">Heading 2</div>
                    <div className="text-xl font-semibold text-white">Heading 3</div>
                    <div className="text-base text-white/70">Body text</div>
                    <div className="text-sm text-white/50">Small text</div>
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-white/80 mb-3">Component Library</h5>
                  <div className="flex space-x-2">
                    <Button className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">Primary</Button>
                    <Button variant="outline" className="border-white/20 text-white">Secondary</Button>
                    <Button variant="ghost" className="text-white/80">Ghost</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything You Need to
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent"> Succeed</span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Powerful features designed to transform how teams collaborate and deliver projects
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl p-8 text-white hover:bg-white/10 transition-all duration-300 group">
              <div className="h-14 w-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-4">AI-Powered Insights</h3>
              <p className="text-white/70">
                Intelligent recommendations, predictive analytics, and automated timeline adjustments keep your projects on track.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl p-8 text-white hover:bg-white/10 transition-all duration-300 group">
              <div className="h-14 w-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-4">Real-time Collaboration</h3>
              <p className="text-white/70">
                Live chat, comments, and seamless team collaboration. Never miss important updates or lose project context.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl p-8 text-white hover:bg-white/10 transition-all duration-300 group">
              <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-4">Advanced Analytics</h3>
              <p className="text-white/70">
                Track progress, identify bottlenecks, and make data-driven decisions with comprehensive project analytics.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl p-8 text-white hover:bg-white/10 transition-all duration-300 group">
              <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-4">Smart Scheduling</h3>
              <p className="text-white/70">
                Automatic timeline adjustments based on team capacity, dependencies, and historical performance data.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl p-8 text-white hover:bg-white/10 transition-all duration-300 group">
              <div className="h-14 w-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-4">Team Management</h3>
              <p className="text-white/70">
                Organize teams with roles, permissions, and intelligent workload distribution for maximum productivity.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl p-8 text-white hover:bg-white/10 transition-all duration-300 group">
              <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-4">Enterprise Security</h3>
              <p className="text-white/70">
                Bank-grade encryption, GDPR compliance, role-based access control, and comprehensive audit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-24 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-4" />
              <div className="text-5xl font-bold text-white mb-2">75%</div>
              <div className="text-white/70">Faster project delivery</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <Target className="h-8 w-8 text-violet-400 mx-auto mb-4" />
              <div className="text-5xl font-bold text-white mb-2">95%</div>
              <div className="text-white/70">On-time completion rate</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
              <div className="text-5xl font-bold text-white mb-2">80%</div>
              <div className="text-white/70">Less admin overhead</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <Globe className="h-8 w-8 text-blue-400 mx-auto mb-4" />
              <div className="text-5xl font-bold text-white mb-2">100%</div>
              <div className="text-white/70">Free forever</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 px-6 bg-white/5">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Simple,
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent"> Transparent</span>
              Pricing
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Foco is <span className="font-semibold text-violet-300">completely free</span> —no limits, no hidden fees, no surprises. Ever.
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 backdrop-blur-xl border-violet-500/30 rounded-2xl p-8 shadow-2xl">
              <div className="text-center pb-8">
                <div className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white mb-6">
                  <Sparkles className="w-4 h-4 mr-2" />
                  FREE FOREVER
                </div>
                <h3 className="text-3xl text-white mb-2">Foco Pro</h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-6xl font-bold text-white">$0</span>
                  <span className="text-xl text-white/70 ml-2">/month</span>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-white/90">Unlimited projects</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-white/90">Unlimited team members</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-white/90">Voice-powered planning</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-white/90">AI project generation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-white/90">Real-time collaboration</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-white/90">Advanced analytics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-white/90">Priority support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-white/90">Enterprise security</span>
                </div>
              </div>
              
              <div className="hover:scale-105 transition-transform">
                <Link href="/register">
                  <Button className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-lg py-4 rounded-xl shadow-lg">
                    Get Started Free Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6">
        <div className="container mx-auto text-center">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-12 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your
              <span className="block text-violet-200">Project Management?</span>
            </h2>
            <p className="text-xl text-violet-100 mb-10 max-w-3xl mx-auto">
              Join thousands of teams who have revolutionized their productivity with voice-powered AI project planning. Start free today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="hover:scale-105 transition-transform">
                <Link href="/register">
                  <Button className="bg-white text-violet-600 hover:bg-gray-100 text-lg px-10 py-4 rounded-xl shadow-lg">
                    <Mic className="w-5 h-5 mr-2" />
                    Start Voice Planning
                  </Button>
                </Link>
              </div>
              <div className="hover:scale-105 transition-transform">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 text-lg px-10 py-4 rounded-xl backdrop-blur-sm">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-black/50 backdrop-blur-xl border-t border-white/10 text-white/70 py-16 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">Foco</span>
              </div>
              <p className="text-sm text-white/60">
                © 2025 Foco. <span className="text-white font-semibold">Free forever.</span>
              </p>
              <div className="flex items-center space-x-2 mt-4">
                <div className="px-2 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs rounded-full font-medium">
                  AI Powered
                </div>
                <div className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs rounded-full font-medium">
                  Voice Enabled
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#voice" className="hover:text-white transition-colors">Voice Planning</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">System Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Developers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-white/50">
            <p>
              Built with precision • AI integrated • Voice powered • Open Source
            </p>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-semibold text-white">Voice Planning Demo</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowDemo(false)} className="text-white/80 hover:text-white hover:bg-white/10">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="aspect-video bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                <div className="text-center">
                  <div className="h-16 w-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white/70 text-lg mb-2">Experience Voice-Powered Planning</p>
                  <p className="text-white/50">Demo video coming soon - try it live!</p>
                  <Link href="/register">
                    <Button className="mt-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
                      Try Voice Planning Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
