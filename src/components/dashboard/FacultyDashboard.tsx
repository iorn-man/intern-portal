import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Briefcase, Users, CheckCircle, Clock } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id: string | null;
}

const FacultyDashboard = ({ profile }: { profile: Profile }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalInternships: 0,
    totalStudents: 0,
    totalApplications: 0,
    activeInternshipsCount: 0,
    completedInternshipsCount: 0,
    pendingCertificates: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [profile.id]);

  const fetchStats = async () => {
    // Fetch internships count
    const { count: totalCount } = await supabase
      .from("internships")
      .select("*", { count: "exact", head: true })
      .eq("faculty_id", profile.id);

    // Fetch students count only from faculty's department
    const { count: studentCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student")
      .eq("department_id", profile.department_id);

    // Fetch applications count (all applications from students in the faculty's department)
    const { data: internships } = await supabase
      .from("internships")
      .select("id")
      .eq("faculty_id", profile.id);

    const internshipIds = internships?.map((i) => i.id) || [];
    
    let applicationCount = 0;
    let activeCount = 0;
    let completedCount = 0;
    
    // Get ALL internships (from any faculty or admin)
    const { data: allInternships } = await supabase
      .from("internships")
      .select("id");

    const allInternshipIds = allInternships?.map((i) => i.id) || [];

    if (allInternshipIds.length > 0) {
      // Get applications from students in this faculty's department for ALL internships
      const { data: apps } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          student_id,
          certificates(id, status)
        `)
        .in("internship_id", allInternshipIds);

      // Filter applications by students in the faculty's department
      if (apps && apps.length > 0) {
        const studentIds = apps.map(app => app.student_id);
        const { data: students } = await supabase
          .from("profiles")
          .select("id, department_id")
          .in("id", studentIds);

        const departmentStudentIds = students
          ?.filter(s => s.department_id === profile.department_id)
          .map(s => s.id) || [];

        const departmentApps = apps.filter(app => 
          departmentStudentIds.includes(app.student_id)
        );

        applicationCount = departmentApps.length;

        departmentApps.forEach(app => {
          const hasCertificate = app.certificates && app.certificates.length > 0;
          const isVerified = hasCertificate && app.certificates[0].status === 'verified';
          
          if (isVerified) {
            completedCount++;
          } else {
            activeCount++;
          }
        });
      }
    }

    // Also count applications for faculty's own internships
    if (internshipIds.length > 0) {
      const { count } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .in("internship_id", internshipIds);
      
      // This ensures we don't lose the total application count for the card
      if ((count || 0) > applicationCount) {
        applicationCount = count || 0;
      }
    }

    // Fetch all verified certificates count across all departments
    const { count: certCount } = await supabase
      .from("certificates")
      .select("*", { count: "exact", head: true })
      .eq("status", "verified");

    setStats({
      totalInternships: totalCount || 0,
      totalStudents: studentCount || 0,
      totalApplications: applicationCount,
      activeInternshipsCount: activeCount,
      completedInternshipsCount: completedCount,
      pendingCertificates: certCount || 0,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Faculty Dashboard</h2>
        <p className="text-muted-foreground">Manage your internships and applications</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-info-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-info-blue-foreground">Total Internships</CardTitle>
            <Briefcase className="h-4 w-4 text-info-blue-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.totalInternships}</div>
            <p className="text-xs text-info-blue-foreground/70">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-info-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-info-blue-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-info-blue-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.totalStudents}</div>
            <p className="text-xs text-info-blue-foreground/70">Registered students</p>
          </CardContent>
        </Card>

        <Card className="bg-info-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-info-blue-foreground">Applications</CardTitle>
            <Users className="h-4 w-4 text-info-blue-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.totalApplications}</div>
            <p className="text-xs text-info-blue-foreground/70">Total applications</p>
          </CardContent>
        </Card>

        <Card className="bg-info-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-info-blue-foreground">Total Certificates</CardTitle>
            <CheckCircle className="h-4 w-4 text-info-blue-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-blue-foreground">{stats.pendingCertificates}</div>
            <p className="text-xs text-info-blue-foreground/70">Verified certificates</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/internships')}
        >
          <CardHeader>
            <CardTitle>Internships</CardTitle>
            <CardDescription>Manage your posted opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInternships}</div>
            <p className="text-xs text-muted-foreground">Click to manage</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(profile.department_id ? `/student-progress/${profile.department_id}` : '/student-progress')}
        >
          <CardHeader>
            <CardTitle>Student Progress</CardTitle>
            <CardDescription>Track by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">Click to view</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(profile.department_id ? `/certificate-center/${profile.department_id}` : '/certificate-center')}
        >
          <CardHeader>
            <CardTitle>Certificate Center</CardTitle>
            <CardDescription>View certificates by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCertificates}</div>
            <p className="text-xs text-muted-foreground">Verified certificates</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate(profile.department_id ? `/student-data/${profile.department_id}` : '/student-data')}
        >
          <CardHeader>
            <CardTitle>Student Data</CardTitle>
            <CardDescription>View all student information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Total students</p>
          </CardContent>
        </Card>
    </div>
  </div>
);
};

export default FacultyDashboard;
