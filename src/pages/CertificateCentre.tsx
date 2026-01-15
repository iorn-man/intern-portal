import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Award, CheckCircle, XCircle, Clock, ArrowLeft, Building2, Download, FileText, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import JSZip from "jszip";

interface Department {
  id: string;
  name: string;
  count: number;
}

interface CompanyGroup {
  company_name: string;
  internship_id: string;
  certificates: Certificate[];
}

interface Certificate {
  id: string;
  status: string;
  uploaded_at: string;
  certificate_url: string;
  rejection_reason: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
  applications?: {
    internships?: {
      title: string;
      company_name: string;
    };
  };
}

const CertificateCentre = () => {
  const navigate = useNavigate();
  const { departmentId } = useParams();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfile, setUserProfile] = useState<{ department_id: string | null; role: string } | null>(null);
  const [viewingCertificate, setViewingCertificate] = useState<string | null>(null);
  const [certificateType, setCertificateType] = useState<'pdf' | 'image'>('pdf');

  useEffect(() => {
    checkUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.role === 'faculty' && userProfile.department_id) {
        // Faculty has a department, go directly to that department
        if (!departmentId) {
          navigate(`/certificate-centre/${userProfile.department_id}`, { replace: true });
        } else {
          fetchCertificates();
        }
      } else {
        // Admin or faculty without department, show all departments or specific department
        if (departmentId) {
          fetchCertificates();
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
      // Fetch departments, students, and verified certificates in parallel
      const [deptResult, studentsResult, certsResult] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name")
          .order("name"),
        supabase
          .from("profiles")
          .select("id, department_id")
          .eq("role", "student"),
        supabase
          .from("certificates")
          .select("id, student_id")
          .eq("status", "verified")
      ]);

      if (!deptResult.data) return;

      // Count verified certificates per department
      const deptCounts = deptResult.data.map(dept => {
        const deptStudentIds = studentsResult.data?.filter(s => s.department_id === dept.id).map(s => s.id) || [];
        const count = certsResult.data?.filter(cert => deptStudentIds.includes(cert.student_id)).length || 0;

        return {
          id: dept.id,
          name: dept.name,
          count,
        };
      });

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

  const fetchCertificates = async () => {
    try {
      if (!departmentId) return;

      // Get all students from this department
      const { data: students } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "student")
        .eq("department_id", departmentId);

      const studentIds = students?.map(s => s.id) || [];

      if (studentIds.length > 0) {
        // Fetch only verified certificates from students in this department
        const { data, error } = await supabase
          .from("certificates")
          .select(`
            *,
            profiles!certificates_student_id_fkey(full_name, email),
            applications(internship_id, internships(title, company_name))
          `)
          .in("student_id", studentIds)
          .eq("status", "verified")
          .order("uploaded_at", { ascending: false });

        if (error) throw error;

        // Group by company
        const grouped: Record<string, any[]> = {};
        (data as any)?.forEach((cert: any) => {
          const companyName = cert.applications?.internships?.company_name || "Unknown Company";
          if (!grouped[companyName]) {
            grouped[companyName] = [];
          }
          grouped[companyName].push(cert);
        });

        const companyGroupsArray = Object.entries(grouped).map(([company_name, certificates]) => ({
          company_name,
          internship_id: "",
          certificates: certificates as Certificate[],
        }));

        setCompanyGroups(companyGroupsArray);
        setCertificates(data as any || []);
      }
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

  const downloadCertificate = async (path: string, filename: string) => {
    try {
      let url = path;
      // Create signed URL if path is not already a full URL
      if (!path.startsWith('http')) {
        const { data, error } = await supabase.storage
          .from('certificates')
          .createSignedUrl(path, 60 * 60); // 1 hour expiry
        if (error || !data?.signedUrl) {
          throw new Error('Failed to create signed URL');
        }
        url = data.signedUrl;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch certificate (${response.status})`);
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      toast({
        title: "Success",
        description: "Certificate downloaded",
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to download certificate",
        variant: "destructive",
      });
    }
  };

  const downloadAllCertificates = async (companyName: string, certs: Certificate[]) => {
    try {
      const zip = new JSZip();

      for (let i = 0; i < certs.length; i++) {
        const cert = certs[i];
        let url = cert.certificate_url;

        // Create signed URL if path is not already a full URL
        if (!url.startsWith('http')) {
          const { data, error } = await supabase.storage
            .from('certificates')
            .createSignedUrl(url, 60 * 60);
          if (error || !data?.signedUrl) {
            console.error(`Failed to get signed URL for certificate ${i + 1}`);
            continue;
          }
          url = data.signedUrl;
        }

        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch certificate ${i + 1}`);
          continue;
        }
        const blob = await response.blob();
        const ext = cert.certificate_url.split('.').pop() || 'pdf';
        zip.file(`${cert.profiles?.full_name || 'certificate'}_${i + 1}.${ext}`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${companyName}_certificates.zip`;
      link.click();

      toast({
        title: "Success",
        description: "All certificates downloaded",
      });
    } catch (error: any) {
      console.error("Download all error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to download certificates",
        variant: "destructive",
      });
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("certificates")
        .update({
          status: "verified",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Certificate verified" });
      fetchCertificates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      const { error } = await supabase
        .from("certificates")
        .update({
          status: "rejected",
          rejection_reason: reason,
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Certificate rejected" });
      fetchCertificates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
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
              setSearchQuery("");
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
          <Award className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Certificate Centre</h1>
        </div>

        {!departmentId ? (
          <>
            <div className="text-muted-foreground mb-4">
              Select a department to view and manage certificates
            </div>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : departments.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    No certificates uploaded yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {departments.map((dept) => (
                  <Card
                    key={dept.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/certificate-centre/${dept.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {dept.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{dept.count}</p>
                      <p className="text-sm text-muted-foreground">Certificates</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, company, or internship..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : companyGroups.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    No certificates for this department yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {companyGroups.filter(group =>
                  group.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  group.certificates.some(cert =>
                    cert.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    cert.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                ).map((group) => (
                  <Card key={group.internship_id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {group.company_name}
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadAllCertificates(group.company_name, group.certificates)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download All
                        </Button>
                      </div>
                      <CardDescription>
                        {group.certificates.length} certificate(s)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {group.certificates.map((certificate) => (
                        <Card key={certificate.id} className="bg-secondary/20">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">{certificate.profiles?.full_name}</CardTitle>
                                <CardDescription>{certificate.profiles?.email}</CardDescription>
                              </div>
                              {getStatusIcon(certificate.status)}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm">
                              <strong>Status:</strong>{" "}
                              <span className="capitalize">{certificate.status}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded: {new Date(certificate.uploaded_at).toLocaleDateString()}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const path = certificate.certificate_url;
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
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadCertificate(
                                  certificate.certificate_url,
                                  `${certificate.profiles?.full_name}_certificate.pdf`
                                )}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                              {certificate.status === "pending" && (
                                <>
                                  <Button size="sm" onClick={() => handleVerify(certificate.id)}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Verify
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleReject(certificate.id)}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                            {certificate.rejection_reason && (
                              <p className="text-sm text-red-600">
                                <strong>Rejection Reason:</strong> {certificate.rejection_reason}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!viewingCertificate} onOpenChange={(open) => {
        if (!open && viewingCertificate) {
          URL.revokeObjectURL(viewingCertificate);
        }
        if (!open) setViewingCertificate(null);
      }}>
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
    </DashboardLayout>
  );
};

export default CertificateCentre;
