
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, ChevronDown, LogIn, LogOut, User, Settings, Ticket, Plus, Heart, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsDropdown } from "@/components/ui/NotificationsDropdown";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);

      if (data.session) {
        fetchUserProfile(data.session.user.id);
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session);

      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const getInitials = () => {
    if (!userProfile) return "U";
    return `${userProfile.first_name?.[0] || ""}${userProfile.last_name?.[0] || ""}`;
  };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-bold text-xl text-event-purple">Eventro</span>
        </Link>

        {isMobile ? (
          // Mobile Navigation
          <>
            <button
              onClick={toggleMenu}
              className="p-2 text-gray-600 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {isOpen && (
              <div className="absolute top-16 left-0 right-0 bg-white border-b z-20 py-4">
                <nav className="container mx-auto px-4 flex flex-col space-y-3">
                  <Link
                    to="/browse"
                    className="text-gray-700 hover:text-event-purple py-2 px-3 rounded hover:bg-gray-100"
                    onClick={closeMenu}
                  >
                    Browse Events
                  </Link>

                  {isAuthenticated && (
                    <>
                      <Link
                        to="/create"
                        className="text-gray-700 hover:text-event-purple py-2 px-3 rounded hover:bg-gray-100"
                        onClick={closeMenu}
                      >
                        Create Event
                      </Link>
                      <Link
                        to="/favorites"
                        className="text-gray-700 hover:text-event-purple py-2 px-3 rounded hover:bg-gray-100"
                        onClick={closeMenu}
                      >
                        <Heart className="h-4 w-4 mr-2 inline" />
                        Favorites
                      </Link>
                      <Link
                        to="/recommendations"
                        className="text-gray-700 hover:text-event-purple py-2 px-3 rounded hover:bg-gray-100"
                        onClick={closeMenu}
                      >
                        <Sparkles className="h-4 w-4 mr-2 inline" />
                        AI Recommendations
                      </Link>
                    </>
                  )}

                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/profile"
                        className="text-gray-700 hover:text-event-purple py-2 px-3 rounded hover:bg-gray-100"
                        onClick={closeMenu}
                      >
                        My Profile
                      </Link>
                      <Link
                        to="/profile?tab=tickets"
                        className="text-gray-700 hover:text-event-purple py-2 px-3 rounded hover:bg-gray-100"
                        onClick={closeMenu}
                      >
                        <Ticket className="h-4 w-4 mr-2 inline" />
                        My Tickets
                      </Link>
                      <Link
                        to="/admin"
                        className="text-gray-700 hover:text-event-purple py-2 px-3 rounded hover:bg-gray-100"
                        onClick={closeMenu}
                      >
                        Admin
                      </Link>
                      <Button
                        variant="ghost"
                        className="flex justify-start"
                        onClick={() => {
                          handleLogout();
                          closeMenu();
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={closeMenu}>
                        <Button
                          variant="ghost"
                          className="flex justify-start w-full"
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Login
                        </Button>
                      </Link>
                      <Link to="/signup" onClick={closeMenu}>
                        <Button
                          variant="ghost"
                          className="flex justify-start w-full"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Sign Up
                        </Button>
                      </Link>
                    </>
                  )}
                </nav>
              </div>
            )}
          </>
        ) : (
          // Desktop Navigation
          <div className="flex items-center gap-6">
            <nav className="flex items-center space-x-6">
              <Link
                to="/browse"
                className="text-gray-700 hover:text-event-purple"
              >
                Browse Events
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/create"
                    className="text-gray-700 hover:text-event-purple flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Event
                  </Link>
                  <Link
                    to="/favorites"
                    className="text-gray-700 hover:text-event-purple flex items-center"
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    Favorites
                  </Link>
                  <Link
                    to="/recommendations"
                    className="text-gray-700 hover:text-event-purple flex items-center"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI Recommendations
                  </Link>
                </>
              )}
            </nav>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <NotificationsDropdown />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.avatar_url || undefined} alt={getInitials()} />
                        <AvatarFallback className="bg-event-purple text-white">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile?tab=tickets" className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      My Tickets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex space-x-3">
                <Link to="/login">
                  <Button className="bg-event-purple hover:bg-event-purple/90">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="outline">
                    <User className="h-4 w-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
