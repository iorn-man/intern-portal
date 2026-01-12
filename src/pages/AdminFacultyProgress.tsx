import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/DashboardLayout";

interface FacultyProgress {
  id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  departments?: { name: string };
  internship_count: number;
  application_count: number;
}

const AdminFacultyProgress = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [facultyProgress, setFacultyProgress] = useState<FacultyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchFacultyProgress();
  }, []);

  const fetchFacultyProgress = async () => {
    try {
      const { data: faculty, error: facultyError } = await supabase
        .from("profiles")
        .select("id, full_name, email, department_id, departments(name)")
        .eq("role", "faculty")
        .order("full_name");

      if (facultyError) throw facultyError;

      // Fetch all internships created by faculty members (not admins)
      const facultyIds = faculty?.map(f => f.id) || [];
      
      const { data: allInternships } = await supabase
        .from("internships")
        .select("id, faculty_id")
        .in("faculty_id", facultyIds);

      const { data: allApplications } = await supabase
        .from("applications")
        .select("id, internship_id");

      const progressData = (faculty || []).map((f) => {
        // Get internships created by this faculty member
        const facultyInternships = allInternships?.filter(i => i.faculty_id === f.id) || [];
        const internshipIds = facultyInternships.map(i => i.id);

        // Count applications for these internships
        const applicationCount = allApplications?.filter(app => 
          internshipIds.includes(app.internship_id)
        ).length || 0;

        return {
          ...f,
          internship_count: facultyInternships.length,
          application_count: applicationCount,
        };
      });

      setFacultyProgress(progressData);
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

  const filteredFaculty = facultyProgress.filter(f =>
    f.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.departments?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin-faculty-management')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div>
          <h1 className="text-3xl font-bold">Faculty Progress</h1>
          <p className="text-muted-foreground">Track faculty internship postings and applications</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredFaculty.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No faculty members found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Internships Posted</TableHead>
                    <TableHead>Total Applications</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFaculty.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.full_name}</TableCell>
                      <TableCell>{f.email}</TableCell>
                      <TableCell>{f.departments?.name || "N/A"}</TableCell>
                      <TableCell>{f.internship_count}</TableCell>
                      <TableCell>{f.application_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminFacultyProgress;
