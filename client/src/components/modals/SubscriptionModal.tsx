import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const plans = [
  {
    name: 'Free Plan',
    price: 0,
    period: 'month',
    description: 'Perfect for trying out',
    features: [
      'Up to 5 employees',
      'Basic timesheet features',
      '30-day data retention',
      'Email support'
    ],
    current: false,
    popular: false
  },
  {
    name: 'Standard Plan',
    price: 4,
    period: 'user/month',
    description: 'For growing teams',
    features: [
      'Up to 50 employees',
      'Advanced reporting',
      '1-year data retention',
      'Project management',
      'Priority support'
    ],
    current: true,
    popular: true
  },
  {
    name: 'Advanced Plan',
    price: 5,
    period: 'user/month',
    description: 'For large enterprises',
    features: [
      'Unlimited employees',
      'Custom reporting',
      'Unlimited data retention',
      'API access',
      'Advanced integrations',
      'Dedicated support'
    ],
    current: false,
    popular: false
  }
];

export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Subscription Plans</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-muted-foreground mt-2">
            Choose the plan that best fits your organization
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`subscription-card ${plan.popular ? 'popular' : ''}`}
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
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>

                <ul className="feature-list">
                  {plan.features.map((feature) => (
                    <li key={feature} className="feature-item">
                      <Check className="feature-check w-4 h-4" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full mt-6 ${
                    plan.current 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : plan.popular 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                        : 'bg-background border border-border text-foreground hover:bg-muted'
                  }`}
                  disabled={plan.current}
                >
                  {plan.current ? 'Current Plan' : `Upgrade to ${plan.name.split(' ')[0]}`}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
