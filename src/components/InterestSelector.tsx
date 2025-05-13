import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getUserInterests, updateUserInterests } from "@/services/recommendationService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserInterest {
  category: string;
  interest_level: number;
}

interface InterestSelectorProps {
  userId?: string;
  onComplete?: () => void;
}

const availableCategories = [
  "Technology",
  "Music",
  "Business",
  "Education",
  "Food & Drink",
  "Health",
  "Sports",
  "Arts",
  "Science",
  "Community",
];

const InterestSelector = ({ userId, onComplete }: InterestSelectorProps) => {
  const [interests, setInterests] = useState<UserInterest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
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
      loadInterests();
    }
  }, [isAuthenticated, currentUserId]);

  const loadInterests = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      const userInterests = await getUserInterests(currentUserId);
      
      // Create a complete set of interests, including ones the user hasn't set yet
      const completeInterests = availableCategories.map(category => {
        const existing = userInterests.find(i => i.category === category);
        return existing || { category, interest_level: 1 };
      });
      
      setInterests(completeInterests);
    } catch (error) {
      console.error("Error loading user interests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInterests = async () => {
    if (!currentUserId) return;
    
    setSaving(true);
    try {
      const success = await updateUserInterests(currentUserId, interests);
      
      if (success) {
        toast.success("Your interests have been saved!");
        if (onComplete) {
          onComplete();
        }
      } else {
        toast.error("Failed to save your interests.");
      }
    } catch (error) {
      console.error("Error saving user interests:", error);
      toast.error("An error occurred while saving your interests.");
    } finally {
      setSaving(false);
    }
  };

  const handleInterestChange = (category: string, level: number) => {
    setInterests(prev => 
      prev.map(interest => 
        interest.category === category 
          ? { ...interest, interest_level: level } 
          : interest
      )
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Interests</CardTitle>
        <CardDescription>
          Help us personalize your event recommendations by setting your interest levels.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {interests.map((interest) => (
              <div key={interest.category} className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">
                    {interest.category}
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {interest.interest_level === 1 && "Not Interested"}
                    {interest.interest_level > 1 && interest.interest_level < 5 && "Somewhat Interested"}
                    {interest.interest_level >= 5 && interest.interest_level < 8 && "Interested"}
                    {interest.interest_level >= 8 && "Very Interested"}
                  </span>
                </div>
                <Slider
                  value={[interest.interest_level]}
                  min={1}
                  max={10}
                  step={1}
                  className="py-4"
                  onValueChange={([value]) => handleInterestChange(interest.category, value)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button
          onClick={handleSaveInterests}
          disabled={saving || loading}
          className="w-full"
        >
          {saving ? "Saving..." : "Save Interests"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InterestSelector;
