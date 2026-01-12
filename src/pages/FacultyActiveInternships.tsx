import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Clock, ArrowLeft, FileText, CheckCircle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Application {
  id: string;
  status: string;
  applied_at: string;
  student_id: string;
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
    certificate_url: string;
    status: string;
  }>;
}

const FacultyActiveInternships = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const departmentFilter = searchParams.get('dept');
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingCertificate, setViewingCertificate] = useState<string | null>(null);
  const [certificateType, setCertificateType] = useState<'pdf' | 'image'>('pdf');

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
          certificates(id, certificate_url, status)
        `)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      
      // Filter active internships (not verified) and by department
      let activeApps = data?.filter(app => {
        const hasCertificate = app.certificates && app.certificates.length > 0;
        const isVerified = hasCertificate && app.certificates[0].status === 'verified';
        const inDepartment = !targetDepartment || app.profiles?.department_id === targetDepartment;
        return !isVerified && inDepartment;
      }) || [];
      
      setApplications(activeApps);
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

      const { error: certError } = await supabase
        .from('certificates')
        .update({ 
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user.id
        })
        .eq('id', certificateId);

      if (certError) throw certError;

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
          <Clock className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Active Internships</h1>
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
                {searchQuery ? "No matching active internships" : "No active internships"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredApplications.map((application) => {
              const hasCertificate = application.certificates && application.certificates.length > 0;
              const isCompleted = application.status === 'completed';
              const canVerify = hasCertificate && isCompleted;

              return (
                <Card key={application.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{application.profiles?.full_name}</CardTitle>
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <CardDescription>{application.profiles?.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">
                      <strong>Internship:</strong> {application.internships?.title} at {application.internships?.company_name}
                    </p>
                    <p className="text-sm">
                      <strong>Status:</strong>{" "}
                      <span className="capitalize">
                        {isCompleted ? 'Waiting for Verification' : application.status}
                      </span>
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

                    {hasCertificate && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const path = application.certificates![0].certificate_url;
                              let url = path;
                              if (!path.startsWith('http')) {
                                const { data } = await supabase.storage
                                  .from('certificates')
                                  .createSignedUrl(path, 60 * 60);
                                url = data?.signedUrl || '';
                              }
                              if (url) {
                                // Fetch as blob to avoid Chrome blocking
                                const isPdf = path.toLowerCase().endsWith('.pdf');
                                const response = await fetch(url);
                                if (!response.ok) {
                                  throw new Error(`Failed to fetch certificate (${response.status})`);
                                }
                                const blob = await response.blob();
                                const mime = isPdf
                                  ? 'application/pdf'
                                  : path.toLowerCase().endsWith('.png')
                                    ? 'image/png'
                                    : path.toLowerCase().endsWith('.jpg') || path.toLowerCase().endsWith('.jpeg')
                                      ? 'image/jpeg'
                                      : path.toLowerCase().endsWith('.webp')
                                        ? 'image/webp'
                                        : blob.type || 'application/octet-stream';
                                const typedBlob = blob.type ? blob : new Blob([blob], { type: mime });
                                const blobUrl = URL.createObjectURL(typedBlob);
                                setViewingCertificate(blobUrl);
                                setCertificateType(isPdf ? 'pdf' : 'image');
                              }
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to load certificate",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Certificate
                        </Button>
                        
                        {canVerify && (
                          <Button
                            size="sm"
                            onClick={() => handleVerify(application.id, application.certificates![0].id)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Verify
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!viewingCertificate} onOpenChange={(open) => {
        if (!open && viewingCertificate) {
          URL.revokeObjectURL(viewingCertificate);
        }
        if (!open) setViewingCertificate(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {viewingCertificate && (
              certificateType === 'pdf' ? (
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

export default FacultyActiveInternships;
