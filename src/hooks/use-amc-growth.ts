import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAMCAuth } from '@/contexts/AMCAuthContext';
import { useLocation } from 'react-router-dom';

interface AMCGrowthState {
  shouldShowTour: boolean;
  hasActiveAMC: boolean;
  isLoading: boolean;
  customerData: {
    ticketCount: number;
    systemCount: number;
    totalSpent: number;
    hasWarrantyExpired: boolean;
  };
}

interface AMCMetadata {
  amc_popup_last_shown: string | null;
  amc_intro_completed: boolean;
  amc_popup_dismiss_count: number;
}

// Pages where we should NOT show the popup (critical work)
const CRITICAL_PAGES = [
  '/amc/new-order',
  '/amc/payment',
  '/amc/support', // When creating a ticket
];

const POPUP_INTERVAL_HOURS = 48; // Show popup every 48 hours if no AMC

/**
 * Hook for FL Smartech AMC Growth Agent
 * Manages smart popup timing, personalization, and tracking
 * Uses Supabase auth.users.user_metadata for storage (no extra tables needed)
 */
export function useAMCGrowth() {
  const { session, isAuthenticated } = useAMCAuth();
  const location = useLocation();
  
  const [state, setState] = useState<AMCGrowthState>({
    shouldShowTour: false,
    hasActiveAMC: false,
    isLoading: true,
    customerData: {
      ticketCount: 0,
      systemCount: 0,
      totalSpent: 0,
      hasWarrantyExpired: false,
    },
  });

  const [metadata, setMetadata] = useState<AMCMetadata>({
    amc_popup_last_shown: null,
    amc_intro_completed: false,
    amc_popup_dismiss_count: 0,
  });

  // Check if current page is a critical page
  const isOnCriticalPage = useCallback(() => {
    return CRITICAL_PAGES.some(page => location.pathname.includes(page));
  }, [location.pathname]);

  // Load metadata from user_metadata
  const loadMetadataFromUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.user_metadata) {
        setMetadata({
          amc_popup_last_shown: user.user_metadata.amc_popup_last_shown || null,
          amc_intro_completed: user.user_metadata.amc_intro_completed ?? false,
          amc_popup_dismiss_count: user.user_metadata.amc_popup_dismiss_count ?? 0,
        });
      }
    } catch (error) {
      console.error('Error loading AMC metadata:', error);
    }
  }, []);

  // Fetch user's AMC customer data
  const fetchCustomerData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Load metadata from user_metadata
      await loadMetadataFromUser();

      // Fetch AMC orders to check if user has active AMC
      const { data: orders } = await supabase
        .from('amc_responses')
        .select('amc_form_id, status, amount, amc_systems(id)')
        .eq('customer_user_id', session.user.id)
        .eq('unsubscribed', false);

      const activeOrders = orders?.filter(o => o.status === 'active') || [];
      const hasActiveAMC = activeOrders.length > 0;
      
      const totalSpent = orders?.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0) || 0;
      const systemCount = orders?.reduce((sum, o) => sum + (o.amc_systems?.length || 0), 0) || 0;

      // Fetch support tickets count
      const { count: ticketCount } = await supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('customer_user_id', session.user.id);

      setState(prev => ({
        ...prev,
        hasActiveAMC,
        isLoading: false,
        customerData: {
          ticketCount: ticketCount || 0,
          systemCount,
          totalSpent,
          hasWarrantyExpired: false, // Can be enhanced later
        },
      }));

    } catch (error) {
      console.error('Error fetching AMC growth data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [session?.user?.id, loadMetadataFromUser]);

  // Determine if tour should be shown
  const calculateShouldShowTour = useCallback(() => {
    // Don't show if still loading
    if (state.isLoading) return false;
    
    // Don't show if user has active AMC
    if (state.hasActiveAMC) return false;
    
    // Don't show on critical pages
    if (isOnCriticalPage()) return false;
    
    // Don't show if not authenticated
    if (!isAuthenticated) return false;

    // First login - always show
    if (!metadata.amc_intro_completed && !metadata.amc_popup_last_shown) {
      return true;
    }

    // Check if 48 hours have passed since last popup
    if (metadata.amc_popup_last_shown) {
      const lastShown = new Date(metadata.amc_popup_last_shown);
      const now = new Date();
      const hoursSinceLastShown = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastShown >= POPUP_INTERVAL_HOURS) {
        return true;
      }
    }

    return false;
  }, [state.isLoading, state.hasActiveAMC, isOnCriticalPage, isAuthenticated, metadata]);

  // Update metadata in user_metadata (Supabase auth)
  const updateMetadata = useCallback(async (updates: Partial<AMCMetadata>) => {
    try {
      // Get current metadata first
      const { data: { user } } = await supabase.auth.getUser();
      const currentMetadata = user?.user_metadata || {};

      // Merge with updates
      const newMetadata = {
        ...currentMetadata,
        ...(updates.amc_popup_last_shown !== undefined && { amc_popup_last_shown: updates.amc_popup_last_shown }),
        ...(updates.amc_intro_completed !== undefined && { amc_intro_completed: updates.amc_intro_completed }),
        ...(updates.amc_popup_dismiss_count !== undefined && { amc_popup_dismiss_count: updates.amc_popup_dismiss_count }),
      };

      // Update user metadata
      await supabase.auth.updateUser({
        data: newMetadata
      });

      // Update local state
      setMetadata(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error updating AMC metadata:', error);
    }
  }, []);

  // Called when user closes or completes the tour
  const handleTourComplete = useCallback(async () => {
    await updateMetadata({
      amc_popup_last_shown: new Date().toISOString(),
      amc_intro_completed: true,
    });
    setState(prev => ({ ...prev, shouldShowTour: false }));
  }, [updateMetadata]);

  // Called when user dismisses the tour
  const handleTourDismiss = useCallback(async () => {
    await updateMetadata({
      amc_popup_last_shown: new Date().toISOString(),
      amc_popup_dismiss_count: metadata.amc_popup_dismiss_count + 1,
    });
    setState(prev => ({ ...prev, shouldShowTour: false }));
  }, [updateMetadata, metadata.amc_popup_dismiss_count]);

  // Trigger tour manually (for "Learn about AMC" button)
  const triggerTour = useCallback(() => {
    setState(prev => ({ ...prev, shouldShowTour: true }));
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated && session?.user?.id) {
      fetchCustomerData();
    }
  }, [isAuthenticated, session?.user?.id, fetchCustomerData]);

  // Calculate if tour should show when data/location changes
  useEffect(() => {
    const shouldShow = calculateShouldShowTour();
    
    // Only show on dashboard page (not during navigation)
    if (shouldShow && location.pathname === '/amc/dashboard') {
      // Small delay to let page render first
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, shouldShowTour: true }));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [calculateShouldShowTour, location.pathname]);

  return {
    shouldShowTour: state.shouldShowTour,
    hasActiveAMC: state.hasActiveAMC,
    isLoading: state.isLoading,
    customerData: state.customerData,
    handleTourComplete,
    handleTourDismiss,
    triggerTour,
  };
}
