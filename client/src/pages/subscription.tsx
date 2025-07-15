import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SubscriptionModal } from '@/components/modals/SubscriptionModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  CreditCard, 
  Users, 
  Calendar, 
  Check, 
  TrendingUp, 
  Database,
  Shield,
  Headphones,
  Zap
} from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Free Plan',
    price: 0,
    period: 'month',
    maxUsers: 5,
    features: [
      'Up to 5 employees',
      'Basic timesheet features',
      '30-day data retention',
      'Email support',
      'Basic reporting'
    ],
    color: 'bg-gray-500'
  },
  {
    id: 'standard',
    name: 'Standard Plan',
    price: 4,
    period: 'user/month',
    maxUsers: 50,
    features: [
      'Up to 50 employees',
      'Advanced reporting',
      '1-year data retention',
      'Project management',
      'Priority support',
      'Time tracking analytics',
      'Custom fields'
    ],
    color: 'bg-primary',
    popular: true
  },
  {
    id: 'advanced',
    name: 'Advanced Plan',
    price: 5,
    period: 'user/month',
    maxUsers: -1, // Unlimited
    features: [
      'Unlimited employees',
      'Custom reporting',
      'Unlimited data retention',
      'API access',
      'Advanced integrations',
      'Dedicated support',
      'White-label options',
      'Advanced analytics',
      'SSO integration'
    ],
    color: 'bg-purple-600'
  }
];

export default function Subscription() {
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: organization } = useQuery({
    queryKey: ['/api/organizations', user?.organizationId],
    enabled: !!user?.organizationId,
  });

  const { data: usage } = useQuery({
    queryKey: ['/api/organizations', user?.organizationId, 'usage'],
    enabled: !!user?.organizationId,
  });

  const { data: billingHistory } = useQuery({
    queryKey: ['/api/organizations', user?.organizationId, 'billing'],
    enabled: !!user?.organizationId,
  });

  const upgradePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`/api/organizations/${user?.organizationId}/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) throw new Error('Failed to upgrade plan');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Plan upgraded successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
    },
    onError: () => {
      toast({ title: 'Failed to upgrade plan', variant: 'destructive' });
    },
  });

  const currentPlan = plans.find(plan => plan.id === organization?.subscriptionPlan) || plans[0];
  const userCount = usage?.userCount || 0;
  const usagePercentage = currentPlan.maxUsers > 0 ? (userCount / currentPlan.maxUsers) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Subscription</h1>
        <p className="page-subtitle">Manage your organization's subscription plan</p>
      </div>

      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${currentPlan.color} rounded-lg flex items-center justify-center`}>
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{currentPlan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentPlan.price === 0 ? 'Free' : `$${currentPlan.price}/${currentPlan.period}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {userCount} / {currentPlan.maxUsers === -1 ? '∞' : currentPlan.maxUsers}
                </h3>
                <p className="text-sm text-muted-foreground">Users</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {organization?.subscriptionStatus || 'Active'}
                </h3>
                <p className="text-sm text-muted-foreground">Status</p>
              </div>
            </div>
          </div>

          {/* Usage Progress */}
          {currentPlan.maxUsers > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">User Usage</span>
                <span className="text-sm font-medium">{usagePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              {usagePercentage > 80 && (
                <p className="text-sm text-yellow-600 mt-2">
                  You're approaching your user limit. Consider upgrading your plan.
                </p>
              )}
            </div>
          )}

          {/* Upgrade Button */}
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={() => setSubscriptionModalOpen(true)}
              className="flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`subscription-card ${plan.popular ? 'popular' : ''} ${
                  plan.id === currentPlan.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                {plan.popular && (
                  <div className="subscription-badge">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.maxUsers === -1 ? 'Unlimited users' : `Up to ${plan.maxUsers} users`}
                  </p>
                </div>

                <ul className="feature-list">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="feature-item">
                      <Check className="feature-check w-4 h-4" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full mt-6 ${
                    plan.id === currentPlan.id
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : plan.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-background border border-border text-foreground hover:bg-muted'
                  }`}
                  disabled={plan.id === currentPlan.id || upgradePlanMutation.isPending}
                  onClick={() => {
                    if (plan.id !== currentPlan.id) {
                      upgradePlanMutation.mutate(plan.id);
                    }
                  }}
                >
                  {plan.id === currentPlan.id 
                    ? 'Current Plan' 
                    : upgradePlanMutation.isPending 
                      ? 'Upgrading...' 
                      : `Upgrade to ${plan.name.split(' ')[0]}`
                  }
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Active Users</span>
                </div>
                <span className="font-medium">{userCount}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Storage Used</span>
                </div>
                <span className="font-medium">{usage?.storageUsed || '0 MB'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">API Calls</span>
                </div>
                <span className="font-medium">{usage?.apiCalls || '0'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Security Score</span>
                </div>
                <span className="font-medium text-green-600">95%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingHistory?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No billing history available
                </p>
              ) : (
                billingHistory?.slice(0, 5).map((bill: any) => (
                  <div key={bill.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{bill.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(bill.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${bill.amount}</p>
                      <Badge className={bill.status === 'paid' ? 'badge success' : 'badge warning'}>
                        {bill.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Information */}
      <Card>
        <CardHeader>
          <CardTitle>Support & Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Headphones className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Support Level</h4>
                <p className="text-sm text-muted-foreground">
                  {currentPlan.id === 'free' ? 'Email Support' : 
                   currentPlan.id === 'standard' ? 'Priority Support' : 
                   'Dedicated Support'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Data Retention</h4>
                <p className="text-sm text-muted-foreground">
                  {currentPlan.id === 'free' ? '30 days' : 
                   currentPlan.id === 'standard' ? '1 year' : 
                   'Unlimited'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Security</h4>
                <p className="text-sm text-muted-foreground">
                  {currentPlan.id === 'advanced' ? 'SSO + Advanced' : 'Standard Security'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
      />
    </div>
  );
}
