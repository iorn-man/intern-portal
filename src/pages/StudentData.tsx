import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, ArrowLeft, Building2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import StudentManager from "@/components/faculty/StudentManager";

interface Department {
  id: string;
  name: string;
  count: number;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  skills: string[] | null;
  preferred_domains: string[] | null;
  departments?: {
    name: string;
  };
}

interface FacultyProfile {
  id: string;
  department_id: string | null;
}

const StudentData = () => {
  const navigate = useNavigate();
  const { departmentId } = useParams();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [facultyProfile, setFacultyProfile] = useState<FacultyProfile & { role: string } | null>(null);

  useEffect(() => {
    fetchFacultyProfile();
  }, []);

  useEffect(() => {
    if (facultyProfile) {
      if (facultyProfile.role === 'faculty' && facultyProfile.department_id) {
        // Faculty has a department, go directly to that department
        if (!departmentId) {
          navigate(`/student-data/${facultyProfile.department_id}`, { replace: true });
        } else {
          fetchStudents();
        }
      } else {
        // Admin or faculty without department, show all departments or specific department
        if (departmentId) {
          fetchStudents();
        } else {
          fetchDepartments();
        }
      }
    }
  }, [departmentId, facultyProfile]);

  const fetchFacultyProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, department_id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      setFacultyProfile(data as any);
    } catch (error: any) {
      console.error("Error fetching faculty profile:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      // Fetch departments and students in parallel for optimal performance
      const [deptResult, studentsResult] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name")
          .order("name"),
        supabase
          .from("profiles")
          .select("id, department_id")
          .eq("role", "student")
      ]);

      if (deptResult.error) throw deptResult.error;
      if (!deptResult.data) return;

      // Count students per department
      const deptCounts = deptResult.data.map(dept => ({
        id: dept.id,
        name: dept.name,
        count: studentsResult.data?.filter(s => s.department_id === dept.id).length || 0,
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

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select("*, departments(name)")
        .eq("role", "student");

      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }

      const { data, error } = await query.order("full_name");

      if (error) throw error;
      setStudents(data || []);
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

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.departments?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (departmentId) {
              // If viewing specific department, go back based on role
              if (facultyProfile?.role === 'admin') {
                navigate('/admin-student-management');
              } else {
                navigate('/dashboard');
              }
            } else {
              // If in department selection, go back to dashboard or admin panel
              if (facultyProfile?.role === 'admin') {
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
          <h1 className="text-3xl font-bold">Student Data</h1>
        </div>

        {!departmentId ? (
          <>
            <div className="text-muted-foreground mb-4">
              Select a department to view student data
            </div>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : departments.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    No departments found
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {departments.map((dept) => (
                  <Card
                    key={dept.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/student-data/${dept.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {dept.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{dept.count}</p>
                      <p className="text-sm text-muted-foreground">Students</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {facultyProfile && departmentId && (
              <StudentManager profile={{ id: facultyProfile.id, department_id: departmentId }} />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentData;
