import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft, Phone, Sparkles, Clock, IndianRupee, Wifi, Truck, Gift, Bot, Monitor, Globe, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface AMCEducationTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  customerData?: {
    ticketCount?: number;
    systemCount?: number;
    totalSpent?: number;
    hasWarrantyExpired?: boolean;
  };
}

interface TourStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

/**
 * FL Smartech AMC Education Tour
 * Professional IT partner guiding customers about AMC services
 */
export function AMCEducationTour({
  isOpen,
  onClose,
  onComplete,
  customerData = {},
}: AMCEducationTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const { ticketCount = 0 } = customerData;

  const steps: TourStep[] = [
    {
      id: 'overview',
      title: 'What is FL Smartech AMC?',
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            <strong>Annual Maintenance Contract (AMC)</strong> is a subscription-based service that provides timely maintenance and issue resolution for your devices.
          </p>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-blue-900 dark:text-blue-200 text-lg">FL Smartech AMC</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">Complete Device Care</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">₹999</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">per year</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Up to <strong>6 service requests</strong> within validity period</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">1 Year Validity</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Wifi className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Remote Support</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Truck className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Physical Service</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Monitor className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Device Tracking</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'remote-amc',
      title: 'Remote AMC Services',
      icon: <Globe className="h-8 w-8 text-indigo-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Remote AMC eliminates unnecessary travel, long waiting times, and full-day disruptions. Get professional support from your home or workplace.
          </p>

          <div className="space-y-3">
            {[
              { title: 'No Travel Required', desc: 'Most issues diagnosed and resolved remotely', icon: <Wifi className="h-5 w-5" /> },
              { title: 'On-Time Delivery', desc: 'Services delivered with minimal delay', icon: <Clock className="h-5 w-5" /> },
              { title: 'India & Abroad', desc: 'Available for customers worldwide (IST hours)', icon: <Globe className="h-5 w-5" /> },
              { title: 'AI-Assisted Support', desc: 'Up to 10 service requests with AI-enabled systems', icon: <Bot className="h-5 w-5" /> },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="font-medium text-indigo-800 dark:text-indigo-300">{item.title}</p>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Focus on your work</strong> — we take care of your devices without disrupting your day.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'physical-amc',
      title: 'Physical AMC Services',
      icon: <Truck className="h-8 w-8 text-amber-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            When remote diagnostics indicate physical inspection is required, we transition to Physical AMC for hands-on service.
          </p>

          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
              <Truck className="h-5 w-5" />
              How Physical AMC Works
            </h4>
            <div className="space-y-2 text-sm">
              {[
                'Service executive visits your location',
                'Device collected for inspection & repair',
                'Service performed at our facility',
                'Device returned after completion',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <div className="h-5 w-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xs font-bold text-amber-800 dark:text-amber-200">
                    {i + 1}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">24-48 hrs</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Pickup Time</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Live</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Device Tracking</p>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
            <strong>Note:</strong> Physical AMC has separate logistics charges based on your location. Spare parts and advanced repairs are quoted separately with your approval.
          </div>
        </div>
      ),
    },
    {
      id: 'benefits',
      title: 'Complimentary Benefits',
      icon: <Gift className="h-8 w-8 text-pink-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            FL Smartech AMC includes additional benefits to enhance your experience:
          </p>

          <div className="space-y-3">
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-6 w-6 text-green-600" />
                <h4 className="font-semibold text-green-800 dark:text-green-300">Free Antivirus Protection</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">
                If your device lacks antivirus or it's expiring, we provide antivirus software at no additional cost.
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-2">
                <Laptop className="h-6 w-6 text-purple-600" />
                <h4 className="font-semibold text-purple-800 dark:text-purple-300">Complimentary Laptop Bag</h4>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-400">
                First-time Remote AMC customers may receive a complimentary laptop bag as a goodwill gesture (when antivirus is not applicable).
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-6 w-6 text-blue-600" />
                <h4 className="font-semibold text-blue-800 dark:text-blue-300">System Optimization Tools</h4>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Free maintenance and optimization tools installed during service to improve device performance and stability.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'policy',
      title: 'Pricing & Policy',
      icon: <IndianRupee className="h-8 w-8 text-green-600" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-5 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-green-900 dark:text-green-200 text-xl">₹999</h4>
                <p className="text-sm text-green-700 dark:text-green-400">Annual Subscription</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="space-y-2 text-sm text-green-800 dark:text-green-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>6 service requests per year</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Valid for 1 year from activation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Remote + Physical support</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
            <h5 className="font-semibold text-gray-800 dark:text-gray-200">Cancellation & Refund</h5>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>• Cancel anytime if not satisfied</li>
              <li>• Refund available before 2nd service completion</li>
              <li>• No refund after 2nd service request</li>
              <li>• Unused requests don't carry forward</li>
            </ul>
          </div>

          {ticketCount > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>You've raised {ticketCount} ticket{ticketCount > 1 ? 's' : ''}</strong> — AMC would give you peace of mind with guaranteed support.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-6">
            <Link to="/amc/new-order" className="flex-1">
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                onClick={onComplete}
              >
                Get AMC @ ₹999
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/amc/support" className="flex-1">
              <Button variant="outline" className="w-full" onClick={onComplete}>
                <Phone className="h-4 w-4 mr-2" />
                Talk to Support
              </Button>
            </Link>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-4">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all",
                  idx <= currentStep ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center">
              {currentStepData.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Step {currentStep + 1} of {steps.length}</p>
              <DialogTitle className="text-xl">{currentStepData.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="py-4">
          {currentStepData.content}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleClose} className="text-gray-500">
              Close
            </Button>
            {currentStep < steps.length - 1 && (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
