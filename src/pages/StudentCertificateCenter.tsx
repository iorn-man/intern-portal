import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Award, ArrowLeft, FileText, Download, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Certificate {
  id: string;
  certificate_url: string;
  status: string;
  uploaded_at: string;
  application_id: string;
  applications?: {
    start_date: string;
    end_date: string;
    internships?: {
      title: string;
      company_name: string;
      domain: string;
    };
  };
}

const StudentCertificateCenter = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingCertificate, setViewingCertificate] = useState<string | null>(null);
  const [certificateType, setCertificateType] = useState<'pdf' | 'image'>('pdf');

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("certificates")
        .select(`
          *,
          applications(
            start_date,
            end_date,
            internships(title, company_name, domain)
          )
        `)
        .eq("student_id", user.id)
        .eq("status", "verified")
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
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
          <Award className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Completed Internships</h1>
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
        ) : certificates.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No verified certificates yet. Complete internships and get them verified by faculty.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {certificates.filter(cert =>
              cert.applications?.internships?.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              cert.applications?.internships?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              cert.applications?.internships?.domain.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((certificate) => (
              <Card key={certificate.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    {certificate.applications?.internships?.company_name}
                  </CardTitle>
                  <CardDescription>
                    {certificate.applications?.internships?.title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    <strong>Domain:</strong> {certificate.applications?.internships?.domain}
                  </p>
                  <p className="text-sm">
                    <strong>Start Date:</strong>{" "}
                    {certificate.applications?.start_date 
                      ? new Date(certificate.applications.start_date).toLocaleDateString()
                      : "N/A"}
                  </p>
                  <p className="text-sm">
                    <strong>End Date:</strong>{" "}
                    {certificate.applications?.end_date
                      ? new Date(certificate.applications.end_date).toLocaleDateString()
                      : "N/A"}
                  </p>
                  <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
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
                        className="flex-1"
                        onClick={async () => {
                          const path = certificate.certificate_url;
                          let url = path;
                          if (!path.startsWith('http')) {
                            const { data } = await supabase.storage
                              .from('certificates')
                              .createSignedUrl(path, 60 * 60);
                            url = data?.signedUrl || '';
                          }
                          if (url) {
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `certificate-${certificate.applications?.internships?.company_name || 'download'}`;
                            link.click();
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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

export default StudentCertificateCenter;
