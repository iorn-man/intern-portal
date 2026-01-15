import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Star, ArrowLeft, Upload, CheckCircle, FileText, Clock, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Certificate {
  id: string;
  certificate_url: string;
  status: string;
}

interface Application {
  id: string;
  status: string;
  applied_at: string;
  start_date: string | null;
  end_date: string | null;
  internships?: {
    id: string;
    company_name: string;
    title: string;
    domain: string;
    duration: string;
    departments?: { name: string };
  };
  certificates?: Certificate[];
}

const ActiveInternships = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewingCertificate, setViewingCertificate] = useState<string | null>(null);
  const [certificateType, setCertificateType] = useState<'pdf' | 'image'>('pdf');

  useEffect(() => {
    fetchActiveInternships();
  }, []);

  const fetchActiveInternships = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          internships(
            id,
            company_name,
            title,
            domain,
            duration,
            departments(name)
          ),
          certificates(id, certificate_url, status)
        `)
        .eq("student_id", user.id)
        .in("status", ["pending", "accepted", "approved", "completed"])
        .order("applied_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
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

  const handleUploadCertificate = async () => {
    if (!certificateFile || !uploadingFor || !startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select a certificate file and provide dates",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = certificateFile.name.split('.').pop();
      const fileName = `${user.id}/${uploadingFor}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, certificateFile);

      if (uploadError) throw uploadError;

      // Get the internship_id from the application
      const application = applications.find(app => app.id === uploadingFor);
      if (!application?.internships?.id) {
        throw new Error('Invalid application or internship data');
      }

      // Store the storage path only; we'll create signed URLs when viewing
      const { error: certError } = await supabase
        .from('certificates')
        .insert({
          application_id: uploadingFor,
          student_id: user.id,
          internship_id: application.internships.id,
          certificate_url: fileName,
          status: 'pending'
        });

      if (certError) throw certError;

      const { error: updateError } = await supabase
        .from('applications')
        .update({
          start_date: startDate,
          end_date: endDate
        })
        .eq('id', uploadingFor);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Certificate uploaded successfully",
      });

      setUploadingFor(null);
      setCertificateFile(null);
      setStartDate("");
      setEndDate("");
      fetchActiveInternships();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkComplete = async (applicationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the application details for the email
      const application = applications.find(app => app.id === applicationId);
      if (!application?.internships?.id) {
        throw new Error('Invalid application data');
      }

      // Get user profile for student info
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("full_name, email, department_id")
        .eq("id", user.id)
        .single();

      const { error } = await supabase
        .from('applications')
        .update({ status: 'completed' })
        .eq('id', applicationId);

      if (error) throw error;

      // Send verification notification email to faculty
      try {
        await supabase.functions.invoke("send-verification-notification", {
          body: {
            certificate_id: application.certificates?.[0]?.id || applicationId,
            student_name: studentProfile?.full_name || 'Student',
            student_email: studentProfile?.email || user.email,
            internship_title: application.internships?.title || 'Internship',
            company_name: application.internships?.company_name || 'Company',
            department_id: studentProfile?.department_id,
          },
        });
      } catch (emailError: any) {
        console.error("Failed to send verification email:", emailError);
        // Don't fail the whole operation if email fails
      }

      toast({
        title: "Success",
        description: "Marked as complete - Faculty has been notified for verification",
      });

      fetchActiveInternships();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this internship from active list?")) return;

    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Removed from active internships" });
      fetchActiveInternships();
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
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Star className="h-8 w-8 fill-current" />
          <h1 className="text-3xl font-bold">Active Internships</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company, title, or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No active internships yet. Browse and mark internships as active to track them here.
              </p>
              <div className="text-center mt-4">
                <Button onClick={() => navigate("/student-internships")}>
                  Browse Internships
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applications.filter(app =>
              app.internships?.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              app.internships?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              app.internships?.domain.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((application) => {
              const hasCertificate = application.certificates && application.certificates.length > 0;
              const isCompleted = application.status === 'completed';
              const isVerified = hasCertificate && application.certificates![0].status === 'verified';
              const isPending = application.status === 'pending';
              if (isVerified) return null;

              return (
                <Card
                  key={application.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-current" />
                      {application.internships?.company_name}
                    </CardTitle>
                    <CardDescription>{application.internships?.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm"><strong>Domain:</strong> {application.internships?.domain}</p>
                    <p className="text-sm"><strong>Duration:</strong> {application.internships?.duration}</p>
                    <p className="text-sm">
                      <strong>Status:</strong>{" "}
                      <span className="capitalize">
                        {application.status === 'completed'
                          ? 'Waiting for Faculty Verification'
                          : application.status === 'pending'
                            ? 'Active'
                            : application.status}
                      </span>
                    </p>

                    {hasCertificate && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Certificate uploaded
                      </div>
                    )}

                    {application.start_date && application.end_date && (
                      <div className="text-sm">
                        <p><strong>Start:</strong> {new Date(application.start_date).toLocaleDateString()}</p>
                        <p><strong>End:</strong> {new Date(application.end_date).toLocaleDateString()}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 mt-4">
                      {!isCompleted && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUploadingFor(application.id)}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {hasCertificate ? "Update Certificate" : "Upload Certificate"}
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleMarkComplete(application.id)}
                            disabled={!hasCertificate}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Complete
                          </Button>
                        </>
                      )}

                      {isCompleted && (
                        <>
                          <div className="flex items-center justify-center gap-2 text-yellow-600 font-medium">
                            <Clock className="h-5 w-5" />
                            Waiting for Verification
                          </div>
                          {hasCertificate && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const path = application.certificates![0].certificate_url;
                                let url = path;
                                if (!path.startsWith('http')) {
                                  const { data } = await supabase.storage
                                    .from('certificates')
                                    .createSignedUrl(path, 60 * 60); // 1 hour
                                  url = data?.signedUrl || '';
                                }
                                if (url) {
                                  setViewingCertificate(url);
                                  setCertificateType(path.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image');
                                }
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              View Certificate
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!uploadingFor} onOpenChange={(open) => !open && setUploadingFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Internship Certificate</DialogTitle>
              <DialogDescription>
                Upload your certificate (PDF or image) and provide internship dates
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="certificate">Certificate File (PDF/JPG, max 10MB)</Label>
                <Input
                  id="certificate"
                  type="file"
                  accept=".pdf,.jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && !['application/pdf', 'image/jpeg'].includes(file.type)) {
                      toast({
                        title: 'Error',
                        description: 'Only PDF or JPG files are allowed',
                        variant: 'destructive',
                      });
                      e.target.value = '';
                      return;
                    }
                    if (file && file.size > 10 * 1024 * 1024) {
                      toast({
                        title: "Error",
                        description: "File size must be less than 10MB",
                        variant: "destructive",
                      });
                      e.target.value = '';
                      return;
                    }
                    setCertificateFile(file || null);
                  }}
                />
              </div>
              <Button
                onClick={handleUploadCertificate}
                disabled={!certificateFile || !startDate || !endDate}
                className="w-full"
              >
                Upload Certificate
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingCertificate} onOpenChange={(open) => !open && setViewingCertificate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Certificate</DialogTitle>
            </DialogHeader>
            <div className="w-full h-[70vh] overflow-auto">
              {certificateType === 'pdf' ? (
                <iframe
                  src={viewingCertificate || ''}
                  className="w-full h-full"
                  title="Certificate PDF"
                />
              ) : (
                <img
                  src={viewingCertificate || ''}
                  alt="Certificate"
                  className="w-full h-auto"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ActiveInternships;
