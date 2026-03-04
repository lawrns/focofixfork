'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, CreditCard } from 'lucide-react';
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You are currently on the Pro plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary dark:bg-secondary/30 border dark:border-secondary dark:border-secondary">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Pro Plan</span>
                <Badge variant="secondary">Current</Badge>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                $12/user/month • Billed monthly
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(true)}>
              Change Plan
            </Button>
          </div>

          <div className="mt-6">
            <h4 className="font-medium mb-3">Usage this month</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <div className="text-2xl font-semibold">8/20</div>
                <div className="text-sm text-zinc-500">Team members</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <div className="text-2xl font-semibold">247</div>
                <div className="text-sm text-zinc-500">Tasks created</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <div className="text-2xl font-semibold">12</div>
                <div className="text-sm text-zinc-500">Projects</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            Manage your payment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-14 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-zinc-500" />
              </div>
              <div>
                <div className="font-medium">•••• •••• •••• 4242</div>
                <div className="text-sm text-zinc-500">Expires 12/2027</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => console.log('Payment method update clicked')}
            >
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            Download past invoices
          </CardDescription>
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
