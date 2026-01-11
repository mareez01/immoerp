import React, { useState } from 'react';
import { Bot, X, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AMCBotButtonProps {
  onClick: () => void;
  hasActiveAMC?: boolean;
  className?: string;
}

/**
 * Floating 3D Bot Button for AMC Growth Agent
 * Always visible, triggers the AMC Education Tour when clicked
 * Disguised as a helpful assistant for users with active AMC
 */
export function AMCBotButton({
  onClick,
  hasActiveAMC = false,
  className,
}: AMCBotButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Show tooltip briefly on mount for new users
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(true);
      const hideTimer = setTimeout(() => setShowTooltip(false), 5000);
      return () => clearTimeout(hideTimer);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {/* Tooltip */}
      <div
        className={cn(
          "absolute bottom-full right-0 mb-3 transition-all duration-300",
          (isHovered || showTooltip) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-w-[240px]">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                {hasActiveAMC ? 'Need Help?' : 'Learn about AMC'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {hasActiveAMC 
                  ? 'Get support or view your AMC benefits' 
                  : 'Discover how AMC can protect your devices'
                }
              </p>
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 transform rotate-45" />
        </div>
      </div>

      {/* Bot Button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group relative h-14 w-14 rounded-full shadow-lg transition-all duration-300",
          "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600",
          "hover:shadow-xl hover:shadow-blue-500/25 hover:scale-110",
          "focus:outline-none focus:ring-4 focus:ring-blue-500/50",
          "active:scale-95"
        )}
        aria-label={hasActiveAMC ? "AMC Support Assistant" : "Learn about AMC"}
      >
        {/* Animated rings */}
        <div className="absolute inset-0 rounded-full">
          <div className={cn(
            "absolute inset-0 rounded-full bg-blue-400/30 animate-ping",
            isHovered ? "opacity-100" : "opacity-0"
          )} />
          <div className={cn(
            "absolute -inset-1 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 blur transition-opacity"
          )} />
        </div>

        {/* Bot face - 3D effect */}
        <div className="relative h-full w-full flex items-center justify-center">
          {/* Face background */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
          
          {/* Bot icon with animation */}
          <div className={cn(
            "relative transition-transform duration-300",
            isHovered ? "scale-110" : "scale-100"
          )}>
            <Bot className="h-7 w-7 text-white drop-shadow-lg" />
          </div>

          {/* Eyes glow effect */}
          <div className={cn(
            "absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <div className="h-1 w-1 rounded-full bg-cyan-300 animate-pulse" />
            <div className="h-1 w-1 rounded-full bg-cyan-300 animate-pulse delay-75" />
          </div>
        </div>

        {/* Notification dot for non-AMC users */}
        {!hasActiveAMC && (
          <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">!</span>
          </div>
        )}
      </button>

      {/* Subtle animation for attention */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
