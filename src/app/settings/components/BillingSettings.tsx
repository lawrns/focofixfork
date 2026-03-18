'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, CreditCard, Users, CheckSquare2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function BillingSettings() {
  const [currentPlan] = useState('pro');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['Up to 5 team members', '100 tasks', 'Basic integrations', 'Community support'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 12,
      features: ['Up to 20 team members', 'Unlimited tasks', 'All integrations', 'Priority support', 'AI features', 'Advanced analytics'],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 49,
      features: ['Unlimited team members', 'Unlimited everything', 'SSO & SAML', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
    },
  ];

  const invoices = [
    { id: '1', date: '2026-01-01', amount: 12, status: 'paid' },
    { id: '2', date: '2025-12-01', amount: 12, status: 'paid' },
    { id: '3', date: '2025-11-01', amount: 12, status: 'paid' },
  ];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Current Plan</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                You are currently on the Pro plan
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 rounded-lg bg-secondary dark:bg-secondary/30 border border-gray-200 dark:border-gray-700 gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-semibold">Pro Plan</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-100 border-green-300 dark:border-green-700">Current</Badge>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                $12/user/month • Billed monthly
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(true)} className="sm:ml-4 w-full sm:w-auto">
              Change Plan
            </Button>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Usage this month</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-2xl font-semibold">8/20</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Team members</div>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-2xl font-semibold">247</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tasks created</div>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600">
                    <CheckSquare2 className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-2xl font-semibold">12</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Projects</div>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600">
                    <Folder className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Payment Method</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage your payment information
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 rounded-lg border border-gray-200 dark:border-gray-700 gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="h-12 w-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <div className="font-semibold text-sm">•••• •••• •••• 4242</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Expires 12/2027</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => console.log('Payment method update clicked')}
              className="sm:ml-4 w-full sm:w-auto"
            >
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Invoice History</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Download past invoices
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">
                      {new Date(invoice.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-sm text-zinc-500">${invoice.amount}.00</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20">
                    {invoice.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.success('Invoice download started')}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose a Plan</DialogTitle>
            <DialogDescription>
              Select the plan that best fits your team
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 py-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'relative p-4 rounded-lg border-2 transition-colors',
                  currentPlan === plan.id
                    ? 'border-[color:var(--foco-teal)] bg-secondary dark:bg-secondary/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <div className="text-lg font-semibold">{plan.name}</div>
                <div className="text-2xl font-bold mt-2">
                  ${plan.price}
                  <span className="text-sm font-normal text-zinc-500">/user/mo</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-4"
                  variant={currentPlan === plan.id ? 'outline' : 'default'}
                  disabled={currentPlan === plan.id}
                >
                  {currentPlan === plan.id ? 'Current Plan' : 'Select'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
