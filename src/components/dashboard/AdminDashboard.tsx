import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Briefcase, Building2, GraduationCap } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id: string | null;
}

const AdminDashboard = ({ profile }: { profile: Profile }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalInternships: 0,
    totalDepartments: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { count: studentCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    const { count: facultyCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "faculty");

    const { count: internshipCount } = await supabase
      .from("internships")
      .select("*", { count: "exact", head: true });

    const { count: departmentCount } = await supabase
      .from("departments")
      .select("*", { count: "exact", head: true });

    setStats({
      totalStudents: studentCount || 0,
      totalFaculty: facultyCount || 0,
      totalInternships: internshipCount || 0,
      totalDepartments: departmentCount || 0,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage your institution's internship portal</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-info-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-info-blue-foreground">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-info-blue-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.totalStudents}</div>
            <p className="text-xs text-info-blue-foreground/70">Registered students</p>
          </CardContent>
        </Card>

        <Card className="bg-info-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-info-blue-foreground">Faculty Members</CardTitle>
            <Users className="h-4 w-4 text-info-blue-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.totalFaculty}</div>
            <p className="text-xs text-info-blue-foreground/70">Active faculty</p>
          </CardContent>
        </Card>

        <Card className="bg-info-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-info-blue-foreground">Internships</CardTitle>
            <Briefcase className="h-4 w-4 text-info-blue-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.totalInternships}</div>
            <p className="text-xs text-info-blue-foreground/70">Total posted</p>
          </CardContent>
        </Card>

        <Card className="bg-info-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-info-blue-foreground">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-info-blue-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.totalDepartments}</div>
            <p className="text-xs text-info-blue-foreground/70">Active departments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin-student-management')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Student Management
            </CardTitle>
            <CardDescription>Manage student data and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Click to manage</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin-faculty-management')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Faculty Management
            </CardTitle>
            <CardDescription>Manage faculty members and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Click to manage</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin-internship-management')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Internship Management
            </CardTitle>
            <CardDescription>View and manage all internships</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Click to manage</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin-department-management')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Department Management
            </CardTitle>
            <CardDescription>Add, edit, or remove departments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Click to manage</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
