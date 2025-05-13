import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { getDynamicPricing } from "@/services/recommendationService";
import { supabase } from "@/integrations/supabase/client";

interface DynamicPricingProps {
  userId?: string;
  eventId: string;
  basePrice: number;
}

const DynamicPricing = ({ userId, eventId, basePrice }: DynamicPricingProps) => {
  const [pricing, setPricing] = useState<{
    discountedPrice: number;
    discountPercentage: number;
    reason: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(userId);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const isAuth = !!data.session;
      setIsAuthenticated(isAuth);

      if (isAuth && !currentUserId) {
        setCurrentUserId(data.session?.user.id);
      }
    };

    checkAuth();
  }, [userId, currentUserId]);

  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      loadPricing();
    }
  }, [isAuthenticated, currentUserId, eventId, basePrice]);

  const loadPricing = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const pricingInfo = await getDynamicPricing(currentUserId, eventId, basePrice);
      setPricing(pricingInfo);
    } catch (error) {
      console.error("Error loading dynamic pricing:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-2xl font-bold animate-pulse">
        ${basePrice.toFixed(2)}
      </div>
    );
  }

  if (!isAuthenticated || !pricing || pricing.discountPercentage === 0) {
    return (
      <div className="text-2xl font-bold">
        ${basePrice.toFixed(2)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">${pricing.discountedPrice.toFixed(2)}</span>
        <span className="text-lg text-muted-foreground line-through">${basePrice.toFixed(2)}</span>
        <Badge className="bg-green-500 hover:bg-green-600">{pricing.discountPercentage}% Off</Badge>
      </div>
      {pricing.reason && (
        <div className="text-sm text-muted-foreground italic">
          {pricing.reason}
        </div>
      )}
    </div>
  );
};

export default DynamicPricing;
