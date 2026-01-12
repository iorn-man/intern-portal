import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle, XCircle, Clock, ArrowLeft, Building2, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Department {
  id: string;
  name: string;
  count: number;
}

interface Application {
  id: string;
  status: string;
  applied_at: string;
  student_id: string;
  internship_id: string;
  start_date: string | null;
  end_date: string | null;
  profiles?: {
    full_name: string;
    email: string;
    department_id: string;
  };
  internships?: {
    title: string;
    company_name: string;
    department_id: string;
    departments?: { name: string };
  };
  certificates?: Array<{
    id: string;
    certificate_url: string;
    status: string;
  }>;
}

const StudentProgress = () => {
  const navigate = useNavigate();
  const { departmentId } = useParams();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, completed: 0 });
  const [viewingCertificate, setViewingCertificate] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ department_id: string | null; role: string } | null>(null);

  useEffect(() => {
    checkUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.role === 'faculty' && userProfile.department_id) {
        // Faculty has a department, go directly to that department
        if (!departmentId) {
          navigate(`/student-progress/${userProfile.department_id}`, { replace: true });
        } else {
          fetchApplications();
        }
      } else {
        // Admin or faculty without department, show all departments or specific department
        if (departmentId) {
          fetchApplications();
        } else {
          fetchDepartments();
        }
      }
    }
  }, [departmentId, userProfile]);

  const checkUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("department_id, role")
        .eq("id", user.id)
        .single();

      setUserProfile(profile);
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // Fetch all departments and all applications in one optimized query
      const [deptResult, appsResult] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name")
          .order("name"),
        supabase
          .from("applications")
          .select(`
            id,
            internship_id,
            profiles!applications_student_id_fkey(department_id)
          `)
      ]);

      if (!deptResult.data) return;

      // Get all internship IDs (faculty without dept or admin can see all)
      const { data: allInternships } = await supabase
        .from("internships")
        .select("id");

      const allInternshipIds = allInternships?.map(i => i.id) || [];

      // Filter applications to only those matching internships
      const relevantApps = appsResult.data?.filter(app => 
        allInternshipIds.includes(app.internship_id)
      ) || [];

      // Count applications per department
      const deptCounts = deptResult.data.map(dept => ({
        id: dept.id,
        name: dept.name,
        count: relevantApps.filter(app => 
          app.profiles?.department_id === dept.id
        ).length,
      }));

      setDepartments(deptCounts);
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

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !departmentId) return;

      // Get user profile to check if they're faculty
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, department_id")
        .eq("id", user.id)
        .single();

      // Fetch applications filtered by student's department for performance
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          profiles!applications_student_id_fkey(full_name, email, department_id),
          internships(title, company_name, department_id, departments(name)),
          certificates(id, certificate_url, status)
        `)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      
      // Filter by student's department only (show ALL internships completed by students in this department)
      const filteredData = data?.filter(app => 
        app.profiles?.department_id === departmentId
      );
      
      // Count active (not verified) and completed (verified)
      const activeCount = filteredData?.filter(app => {
        const hasCertificate = app.certificates && app.certificates.length > 0;
        const isVerified = hasCertificate && app.certificates[0].status === 'verified';
        return !isVerified;
      }).length || 0;
      
      const completedCount = filteredData?.filter(app => {
        const hasCertificate = app.certificates && app.certificates.length > 0;
        return hasCertificate && app.certificates[0].status === 'verified';
      }).length || 0;
      
      setStats({ active: activeCount, completed: completedCount });
      setApplications(filteredData || []);
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

  const handleVerify = async (applicationId: string, certificateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update certificate status
      const { error: certError } = await supabase
        .from('certificates')
        .update({ 
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user.id
        })
        .eq('id', certificateId);

      if (certError) throw certError;

      // Update application status to completed
      const { error: appError } = await supabase
        .from('applications')
        .update({ status: 'completed' as any })
        .eq('id', applicationId);

      if (appError) throw appError;

      toast({
        title: "Success",
        description: "Internship verified and marked as completed",
      });

      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string, hasVerifiedCert: boolean) => {
    if (status === "completed" && hasVerifiedCert) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "completed":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (departmentId) {
              // If viewing specific department, go back based on role
              if (userProfile?.role === 'admin') {
                navigate('/admin-student-management');
              } else {
                navigate('/dashboard');
              }
            } else {
              // If in department selection, go back to dashboard or admin panel
              if (userProfile?.role === 'admin') {
                navigate('/admin-student-management');
              } else {
                navigate('/dashboard');
              }
            }
          }}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Student Progress</h1>
        </div>

        {!departmentId ? (
          <>
            <div className="text-muted-foreground mb-4">
              Select a department to view student progress
            </div>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {departments.map((dept) => (
                  <Card
                    key={dept.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/student-progress/${dept.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {dept.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{dept.count}</p>
                      <p className="text-sm text-muted-foreground">Applications</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : applications.length === 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle>Active Internships</CardTitle>
                      <CardDescription>View active student internships</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">0</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle>Completed Internships</CardTitle>
                      <CardDescription>View completed student internships</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">0</p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      No applications for this department yet
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/faculty-active-internships?dept=${departmentId}`)}
                  >
                    <CardHeader>
                      <CardTitle>Active Internships</CardTitle>
                      <CardDescription>View active student internships</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{stats.active}</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/faculty-completed-internships?dept=${departmentId}`)}
                  >
                    <CardHeader>
                      <CardTitle>Completed Internships</CardTitle>
                      <CardDescription>View completed student internships</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{stats.completed}</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <Dialog open={!!viewingCertificate} onOpenChange={(open) => !open && setViewingCertificate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
              {viewingCertificate && (
                viewingCertificate.toLowerCase().includes('.pdf') ? (
                  <iframe
                    src={viewingCertificate}
                    className="w-full h-[70vh]"
                    title="Certificate Preview"
                  />
                ) : (
                  <img
                    src={viewingCertificate}
                    alt="Certificate"
                    className="w-full h-auto"
                  />
                )
              )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default StudentProgress;
