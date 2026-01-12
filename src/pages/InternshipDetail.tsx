import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Application {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  internships?: {
    title: string;
    company_name: string;
    domain: string;
    duration: string;
    description: string;
  };
  profiles?: {
    full_name: string;
    email: string;
  };
  certificates?: Array<{
    id: string;
    certificate_url: string;
    status: string;
  }>;
}

const InternshipDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplicationDetails();
  }, [id]);

  const fetchApplicationDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          internships(title, company_name, domain, duration, description),
          profiles(full_name, email),
          certificates(id, certificate_url, status)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setApplication(data);
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

  const handleDownloadCertificate = (url: string) => {
    window.open(url, '_blank');
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

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : !application ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Application not found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{application.internships?.company_name}</CardTitle>
                <CardDescription>{application.internships?.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Internship Details</h3>
                  <p className="text-sm"><strong>Domain:</strong> {application.internships?.domain}</p>
                  <p className="text-sm"><strong>Duration:</strong> {application.internships?.duration}</p>
                  <p className="text-sm"><strong>Description:</strong> {application.internships?.description}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Student Details</h3>
                  <p className="text-sm"><strong>Name:</strong> {application.profiles?.full_name}</p>
                  <p className="text-sm"><strong>Email:</strong> {application.profiles?.email}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Completion Details</h3>
                  <p className="text-sm"><strong>Start Date:</strong> {new Date(application.start_date).toLocaleDateString()}</p>
                  <p className="text-sm"><strong>End Date:</strong> {new Date(application.end_date).toLocaleDateString()}</p>
                  <p className="text-sm">
                    <strong>Status:</strong>{" "}
                    <span className="capitalize">{application.status}</span>
                  </p>
                </div>

                {application.certificates && application.certificates.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Certificate</h3>
                    <Button
                      variant="outline"
                      onClick={() => handleDownloadCertificate(application.certificates![0].certificate_url)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Certificate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InternshipDetail;
