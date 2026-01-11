import React from 'react';
import { Shield, AlertTriangle, Phone, ArrowRight, CheckCircle2, Clock, IndianRupee, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AMCPromotionPanelProps {
  className?: string;
  hasActiveAMC?: boolean;
  ticketCount?: number;
  systemAge?: number;
  onViewPlans?: () => void;
  onTalkToSupport?: () => void;
}

/**
 * Permanent AMC Promotion Panel - Always visible on dashboard
 * Professional IT company style, not a pop-up ad
 */
export function AMCPromotionPanel({
  className,
  hasActiveAMC = false,
  ticketCount = 0,
  systemAge,
  onViewPlans,
  onTalkToSupport,
}: AMCPromotionPanelProps) {
  // If user already has active AMC, show different content
  if (hasActiveAMC) {
    return (
      <div className={cn(
        "rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-6",
        className
      )}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
            <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Your Systems Are Protected
            </h3>
            <p className="text-sm text-green-700/80 dark:text-green-400/80 mt-1">
              Your AMC subscription is active. Our team is ready to support you anytime.
            </p>
            <div className="mt-4">
              <Link to="/amc/support">
                <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-100">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Personalized messaging based on data
  const getPersonalizedMessage = () => {
    if (ticketCount > 0) {
      const estimatedCost = ticketCount * 2500;
      return `You raised ${ticketCount} support ticket${ticketCount > 1 ? 's' : ''} — that alone could cost ₹${estimatedCost.toLocaleString('en-IN')} with per-incident billing.`;
    }
    if (systemAge && systemAge > 24) {
      return `Systems older than 2 years typically need more maintenance. AMC ensures you're always covered.`;
    }
    return `Most businesses spend ₹8,000–₹15,000 per breakdown. AMC usually costs less than one emergency visit.`;
  };

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
              Protect Your Business with AMC
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Annual Maintenance Contract — Your IT insurance policy
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Unlimited Support Calls</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-green-600" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Priority Response</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <Wrench className="h-3.5 w-3.5 text-green-600" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Preventive Maintenance</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <IndianRupee className="h-3.5 w-3.5 text-green-600" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Fixed Annual Cost</span>
          </div>
        </div>
      </div>

      {/* Risk Warning */}
      <div className="mx-6 mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {getPersonalizedMessage()}
          </p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2">
        <Button 
          onClick={onViewPlans}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          View AMC Plans
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button 
          variant="outline" 
          onClick={onTalkToSupport}
          className="flex-1"
        >
          <Phone className="h-4 w-4 mr-2" />
          Talk to Support
        </Button>
      </div>
    </div>
  );
}
