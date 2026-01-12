import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import FacultyDashboard from "@/components/dashboard/FacultyDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { DashboardLayout } from "@/components/DashboardLayout";

type UserRole = "student" | "faculty" | "admin";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch user profile
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, department_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setProfile(profileData);
      setLoading(false);
    };

    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {profile.role === "student" && <StudentDashboard profile={profile} />}
        {profile.role === "faculty" && <FacultyDashboard profile={profile} />}
        {profile.role === "admin" && <AdminDashboard profile={profile} />}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
