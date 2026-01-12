import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

const AdminFacultyManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalInternships: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get all faculty members
      const { data: facultyData, count: facultyCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact" })
        .eq("role", "faculty");

      // Get internships created by faculty only (exclude admin)
      const facultyIds = facultyData?.map(f => f.id) || [];
      const { count: internshipCount } = await supabase
        .from("internships")
        .select("*", { count: "exact", head: true })
        .in("faculty_id", facultyIds);

      setStats({
        totalFaculty: facultyCount || 0,
        totalInternships: internshipCount || 0,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div>
          <h1 className="text-3xl font-bold">Faculty Management</h1>
          <p className="text-muted-foreground">Manage all faculty-related activities</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin-faculty-details')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Faculty Details
              </CardTitle>
              <CardDescription>View and manage faculty information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFaculty}</div>
              <p className="text-xs text-muted-foreground">Total faculty members</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin-faculty-progress')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Faculty Progress
              </CardTitle>
              <CardDescription>Track faculty internship postings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInternships}</div>
              <p className="text-xs text-muted-foreground">Total internships posted</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminFacultyManagement;
