import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, ArrowLeft, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Application {
  id: string;
  status: string;
  applied_at: string;
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
  };
  certificates?: Array<{
    id: string;
    status: string;
  }>;
}

const FacultyCompletedInternships = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const departmentFilter = searchParams.get('dept');
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get faculty's department
      const { data: profile } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user.id)
        .single();

      // Determine target department (from URL or faculty's own department)
      const targetDepartment = departmentFilter || profile?.department_id;

      // Fetch applications directly with optimized query
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          profiles(full_name, email, department_id),
          internships(title, company_name),
          certificates(id, status)
        `)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      
      // Filter completed internships (verified certificates) and by department
      let completedApps = data?.filter(app => {
        const hasCertificate = app.certificates && app.certificates.length > 0;
        const isVerified = hasCertificate && app.certificates[0].status === 'verified';
        const inDepartment = !targetDepartment || app.profiles?.department_id === targetDepartment;
        return isVerified && inDepartment;
      }) || [];
      
      setApplications(completedApps);
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

  const filteredApplications = applications.filter(app => 
    app.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.internships?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.internships?.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold">Completed Internships</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name, email, or internship..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                {searchQuery ? "No matching completed internships" : "No completed internships"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredApplications.map((application) => (
              <Card key={application.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{application.profiles?.full_name}</CardTitle>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <CardDescription>{application.profiles?.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    <strong>Internship:</strong> {application.internships?.title} at {application.internships?.company_name}
                  </p>
                  <p className="text-sm">
                    <strong>Status:</strong> <span className="text-green-600">Completed</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Applied: {new Date(application.applied_at).toLocaleDateString()}
                  </p>

                  {application.start_date && application.end_date && (
                    <div className="text-sm">
                      <p><strong>Start Date:</strong> {new Date(application.start_date).toLocaleDateString()}</p>
                      <p><strong>End Date:</strong> {new Date(application.end_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FacultyCompletedInternships;
