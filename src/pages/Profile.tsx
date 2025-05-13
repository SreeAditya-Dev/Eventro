
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, UserCircle, Camera, Settings, Ticket, Zap } from "lucide-react";
import { PurchasedTickets } from "@/components/profile/PurchasedTickets";
import InterestSelector from "@/components/InterestSelector";

interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
}

const Profile = () => {
  const [user, setUser] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    bio: "",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'profile';

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Please sign in to view your profile");
        navigate("/login");
        return;
      }

      fetchProfile(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUser(data);
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          bio: data.bio || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Could not load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          bio: formData.bio,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");

      // Update local user state
      setUser(prev => prev ? { ...prev, ...formData } : null);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];

    try {
      setUpdating(true);

      // Check file size
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File size exceeds 2MB limit");
      }

      // Create profiles bucket if it doesn't exist
      try {
        const { data, error: bucketError } = await supabase.storage.getBucket('profiles');
        if (bucketError && bucketError.message.includes('not found')) {
          await supabase.storage.createBucket('profiles', {
            public: true,
            fileSizeLimit: 1024 * 1024 * 2 // 2MB
          });
        }
      } catch (err) {
        console.log("Bucket already exists or error:", err);
      }

      // Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Update local state
      setUser(prev => prev ? { ...prev, avatar_url: publicUrl } : null);

      toast.success("Profile picture updated successfully");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Failed to upload profile picture");
    } finally {
      setUpdating(false);
    }
  };

  const uploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];

    try {
      setUpdating(true);

      // Check file size
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size exceeds 5MB limit");
      }

      // Create profiles bucket if it doesn't exist
      try {
        const { data, error: bucketError } = await supabase.storage.getBucket('profiles');
        if (bucketError && bucketError.message.includes('not found')) {
          await supabase.storage.createBucket('profiles', {
            public: true,
            fileSizeLimit: 1024 * 1024 * 5 // 5MB
          });
        }
      } catch (err) {
        console.log("Bucket already exists or error:", err);
      }

      // Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-banner-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Update local state
      setUser(prev => prev ? { ...prev, banner_url: publicUrl } : null);

      toast.success("Banner image updated successfully");
    } catch (error: any) {
      console.error("Error uploading banner:", error);
      toast.error(error.message || "Failed to upload banner image");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-12 text-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-12 text-center">
        <p>Please sign in to view your profile</p>
        <Button className="mt-4 bg-event-purple hover:bg-event-purple/90" onClick={() => navigate("/login")}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Banner and Avatar Section */}
      <div className="mb-24">
        {/* Banner Image */}
        <div className="relative h-48 md:h-64 bg-gray-200 w-full rounded-lg overflow-hidden">
          {user.banner_url ? (
            <img
              src={user.banner_url}
              alt="Profile Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-event-purple/30 to-blue-400/30">
              <p className="text-gray-500">No banner image</p>
            </div>
          )}

          <label htmlFor="banner-upload" className="absolute bottom-4 right-4 bg-black/50 p-2 rounded-full cursor-pointer hover:bg-black/70 transition-colors">
            <Camera className="h-5 w-5 text-white" />
            <input
              id="banner-upload"
              type="file"
              accept="image/*"
              onChange={uploadBanner}
              className="hidden"
            />
          </label>
        </div>

        {/* Profile Avatar - Positioned outside the banner container */}
        <div className="relative z-10 mx-8 -mt-14">
          <div className="inline-block">
            <Avatar className="h-28 w-28 border-4 border-white shadow-md">
              <AvatarImage src={user.avatar_url || undefined} alt={user.first_name} className="object-cover" />
              <AvatarFallback className="bg-event-purple text-white text-2xl">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full cursor-pointer border border-gray-200 shadow-sm hover:bg-gray-100 transition-colors">
              <Camera className="h-4 w-4 text-gray-700" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="px-8">
        <h1 className="text-2xl font-bold">{user.first_name} {user.last_name}</h1>
        <p className="text-gray-600">{user.email}</p>
      </div>

      <div className="mt-8">
        <Tabs defaultValue={activeTab} className="px-6">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User size={16} />
              Profile
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <Ticket size={16} />
              My Tickets
            </TabsTrigger>
            <TabsTrigger value="interests" className="flex items-center gap-2">
              <Zap size={16} />
              Interests
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings size={16} />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <Button
                    type="submit"
                    className="bg-event-purple hover:bg-event-purple/90"
                    disabled={updating}
                  >
                    {updating ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="mt-6">
            <PurchasedTickets userId={user.id} />
          </TabsContent>

          <TabsContent value="interests" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Interests</CardTitle>
              </CardHeader>
              <CardContent>
                <InterestSelector userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Email Address</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Password</h3>
                  <Button variant="outline" className="text-sm">
                    Change Password
                  </Button>
                </div>

                <div className="pt-4">
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
