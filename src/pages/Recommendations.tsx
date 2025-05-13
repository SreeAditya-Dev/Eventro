
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Route, Brain, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PersonalizedRecommendations from "@/components/PersonalizedRecommendations";
import EventPaths from "@/components/EventPaths";
import InterestSelector from "@/components/InterestSelector";
import { analyzeAndUpdateEvents } from "@/services/recommendationService";
import { Skeleton } from "@/components/ui/skeleton";

const Recommendations = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("recommendations");
  const [skillFilter, setSkillFilter] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const isAuth = !!data.session;
      setIsAuthenticated(isAuth);

      if (isAuth) {
        setUserId(data.session?.user.id);
      } else {
        toast.error("Please sign in to access personalized recommendations");
        navigate("/login");
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Analyze events when the page loads to ensure keywords are extracted
  useEffect(() => {
    if (isAuthenticated) {
      analyzeAndUpdateEvents().catch(error => {
        console.error("Error analyzing events:", error);
      });
    }
  }, [isAuthenticated]);

  // Force refresh recommendations when tab changes to recommendations
  useEffect(() => {
    if (activeTab === "recommendations" && userId) {
      // This will trigger a re-render of the PersonalizedRecommendations component
      const recommendationsComponent = document.getElementById("personalized-recommendations");
      if (recommendationsComponent) {
        const refreshButton = recommendationsComponent.querySelector("button[data-refresh]");
        if (refreshButton instanceof HTMLElement) {
          refreshButton.click();
        }
      }
    }
  }, [activeTab, userId]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-8 w-64" />
        </div>

        <Skeleton className="h-6 w-full max-w-3xl mb-8" />

        <div className="mb-8">
          <Skeleton className="h-10 w-[300px] rounded-md" />
        </div>

        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden event-card h-full flex flex-col">
                  <div className="relative h-48">
                    <Skeleton className="w-full h-full" />
                    <div className="absolute top-3 right-3">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                  <CardContent className="pt-4 flex-grow">
                    <div className="flex items-center mb-2">
                      <Skeleton className="w-4 h-4 mr-1 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <div className="flex items-center">
                      <Skeleton className="w-4 h-4 mr-1 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-center">
              <Skeleton className="h-10 w-48 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">AI-Powered Event Recommendations</h1>
        <p className="mb-6 text-gray-600">Please sign in to access personalized recommendations.</p>
        <Button
          className="bg-event-purple hover:bg-event-purple/90"
          onClick={() => navigate("/login")}
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6 text-event-purple" />
        <h1 className="text-3xl font-bold">AI-Powered Event Discovery</h1>
      </div>

      <p className="text-gray-600 mb-8 max-w-3xl">
        Our AI analyzes your interests, past event participation, and preferences to create a personalized event experience just for you. Discover events you'll love and build skills through curated learning paths.
      </p>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Recommended Events</span>
          </TabsTrigger>
          <TabsTrigger value="paths" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            <span>Learning Paths</span>
          </TabsTrigger>
          <TabsTrigger value="interests" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>My Interests</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="mt-0">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Personalized Event Recommendations</CardTitle>
              <CardDescription>
                Events tailored to your interests and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PersonalizedRecommendations userId={userId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paths" className="mt-0">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Event Learning Paths</CardTitle>
              <CardDescription>
                Curated sequences of events to help you build specific skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventPaths userId={userId} skillFilter={skillFilter} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interests" className="mt-0">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Manage Your Interests</CardTitle>
              <CardDescription>
                Update your interests to improve your recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InterestSelector
                userId={userId}
                onComplete={() => {
                  toast.success("Interests updated! Refreshing your recommendations...");
                  setActiveTab("recommendations");
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Recommendations;
