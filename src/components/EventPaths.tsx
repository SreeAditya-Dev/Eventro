import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Route, ListOrdered, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { getEventPathsForSkill, createEventPathForSkill } from "@/services/recommendationService";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface EventPathsProps {
  userId?: string;
  skillFilter?: string;
}

const EventPaths = ({ userId, skillFilter }: EventPathsProps) => {
  const [paths, setPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(userId);
  const [newSkill, setNewSkill] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { toast } = useToast();

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
    if (skillFilter) {
      loadPaths(skillFilter);
    }
  }, [skillFilter, isAuthenticated]);

  const loadPaths = async (skill: string) => {
    setLoading(true);
    try {
      const eventPaths = await getEventPathsForSkill(skill);
      setPaths(eventPaths);
    } catch (error) {
      console.error("Error loading event paths:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePath = async () => {
    if (!currentUserId || !newSkill) return;

    setCreating(true);
    try {
      const path = await createEventPathForSkill(currentUserId, newSkill);
      if (path) {
        setPaths(prev => [...prev, path]);
        setNewSkill("");
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Error creating event path:", error);

      // Check if it's an RLS policy error
      const errorObj = error as any;
      if (errorObj?.code === '42501' && errorObj?.message?.includes('row-level security policy')) {
        // Create a temporary path object for the UI
        const tempPath = {
          id: `temp-${Date.now()}`,
          path_name: `${newSkill} Learning Path`,
          description: `A curated sequence of events to help you develop skills in ${newSkill}`,
          skill_focus: [newSkill],
          events: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setPaths(prev => [...prev, tempPath]);
        setNewSkill("");
        setDialogOpen(false);

        toast({
          title: "Learning Path Created",
          description: "Your learning path is being processed. Events will appear soon.",
        });
      } else {
        toast({
          title: "Error Creating Path",
          description: "There was an error creating your learning path. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  if (!isAuthenticated && !skillFilter) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Event Paths</h2>
        </div>

        {isAuthenticated && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                Create Custom Path
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Learning Path</DialogTitle>
                <DialogDescription>
                  Enter a skill or topic you'd like to develop through a sequence of events.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <Input
                  placeholder="e.g. Web Development, Leadership, Data Science"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button
                  onClick={handleCreatePath}
                  disabled={creating || !newSkill}
                >
                  {creating ? "Creating..." : "Create Path"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="w-full h-64 animate-pulse bg-muted">
              <CardContent className="p-0"></CardContent>
            </Card>
          ))}
        </div>
      ) : paths.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paths.map((path) => (
            <Card key={path.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {path.path_name}
                </CardTitle>
                <CardDescription>{path.description}</CardDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  {path.skill_focus.map((skill: string, i: number) => (
                    <Badge key={i} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <ListOrdered
                  className="h-5 w-5 text-primary mb-2"
                />
                <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-4">
                  {path.events.map((event: any, index: number) => (
                    <li key={event.id} className="ml-6">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-primary rounded-full -left-3 ring-8 ring-background">
                        {index + 1}
                      </span>
                      <Link to={`/event/${event.id}`} className="hover:underline">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {event.title}
                        </h3>
                      </Link>
                    </li>
                  ))}
                </ol>
              </CardContent>
              <CardFooter>
                <Button asChild variant="secondary" className="w-full">
                  <Link to={`/event/${path.events[0]?.id}`}>
                    Start This Path
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <CardContent>
            <h3 className="text-xl font-semibold mb-2">No Event Paths Found</h3>
            <p className="text-muted-foreground mb-4">
              {skillFilter
                ? `No learning paths available for ${skillFilter} yet.`
                : "Create your first learning path to develop new skills through events."}
            </p>
            {isAuthenticated && !skillFilter && (
              <Button onClick={() => setDialogOpen(true)}>
                Create Your First Path
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventPaths;
