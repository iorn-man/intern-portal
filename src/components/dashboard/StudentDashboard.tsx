import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id: string | null;
}

const StudentDashboard = ({ profile }: { profile: Profile }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalInternships: 0,
    activeInternships: 0,
    completedInternships: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [profile.id]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Total active internships available
      const { count: totalCount } = await supabase
        .from("internships")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Student's applications with certificates
      const { data: applications } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          certificates(id, status)
        `)
        .eq("student_id", user.id);

      const activeCount = applications?.filter(app => {
        const hasCertificate = app.certificates && app.certificates.length > 0;
        const isVerified = hasCertificate && app.certificates[0].status === 'verified';
        return !isVerified;
      }).length || 0;

      const completedCount = applications?.filter(app => {
        const hasCertificate = app.certificates && app.certificates.length > 0;
        return hasCertificate && app.certificates[0].status === 'verified';
      }).length || 0;

      setStats({
        totalInternships: totalCount || 0,
        activeInternships: activeCount,
        completedInternships: completedCount,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Student Dashboard</h2>
        <p className="text-muted-foreground">Explore internship opportunities</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-info-blue cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/student-internships')}
        >
          <CardHeader>
            <CardTitle className="text-info-blue-foreground">Internships</CardTitle>
            <CardDescription className="text-info-blue-foreground/70">Browse available opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.totalInternships}</div>
            <p className="text-xs text-info-blue-foreground/70">Available internships</p>
          </CardContent>
        </Card>

        <Card className="bg-info-blue cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/active-internships')}
        >
          <CardHeader>
            <CardTitle className="text-info-blue-foreground">Active Internships</CardTitle>
            <CardDescription className="text-info-blue-foreground/70">Track your active applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.activeInternships}</div>
            <p className="text-xs text-info-blue-foreground/70">Currently active</p>
          </CardContent>
        </Card>

        <Card className="bg-info-blue cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/student-certificate-center')}
        >
          <CardHeader>
            <CardTitle className="text-info-blue-foreground">Completed Internships</CardTitle>
            <CardDescription className="text-info-blue-foreground/70">View your verified certificates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.completedInternships}</div>
            <p className="text-xs text-info-blue-foreground/70">Completed & verified</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-info-blue cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/student-profile')}
        >
          <CardHeader>
            <CardTitle className="text-info-blue-foreground">Personal Details</CardTitle>
            <CardDescription className="text-info-blue-foreground/70">Edit your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-info-blue-foreground/70">Click to edit</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
