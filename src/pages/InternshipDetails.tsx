import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, ArrowLeft, Star } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Internship {
  id: string;
  company_name: string;
  domain: string;
  title: string;
  duration: string;
  description: string;
  internship_link: string;
  stipend: string | null;
  requirements: string[] | null;
  start_date: string | null;
  end_date: string | null;
  departments?: { name: string };
}

const InternshipDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    fetchInternship();
    checkIfActive();
  }, [id]);

  const fetchInternship = async () => {
    try {
      const { data, error } = await supabase
        .from("internships")
        .select("*, departments(name)")
        .eq("id", id)
        .single();

      if (error) throw error;
      setInternship(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/student-internships");
    } finally {
      setLoading(false);
    }
  };

  const checkIfActive = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("applications")
        .select("id")
        .eq("internship_id", id)
        .eq("student_id", user.id)
        .maybeSingle();

      setIsActive(!!data);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleToggleActive = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      if (isActive) {
        const { error } = await supabase
          .from("applications")
          .delete()
          .eq("internship_id", id)
          .eq("student_id", user.id);

        if (error) throw error;
        toast({ title: "Success", description: "Removed from active internships" });
        setIsActive(false);
      } else {
        const { error } = await supabase
          .from("applications")
          .insert({
            internship_id: id!,
            student_id: user.id,
            status: "pending",
          });

        if (error) throw error;
        toast({ title: "Success", description: "Added to active internships" });
        setIsActive(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6 text-center">Loading...</div>;
  }

  if (!internship) {
    return <div className="container mx-auto p-6 text-center">Internship not found</div>;
  }

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

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">{internship.company_name}</CardTitle>
              <CardDescription className="text-xl mt-2">{internship.title}</CardDescription>
            </div>
            <Button
              variant={isActive ? "default" : "outline"}
              onClick={handleToggleActive}
              className="flex items-center gap-2"
            >
              <Star className={`h-4 w-4 ${isActive ? "fill-current" : ""}`} />
              {isActive ? "Active" : "Mark Active"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Details</h3>
              <div className="space-y-2">
                <p><strong>Domain:</strong> {internship.domain}</p>
                <p><strong>Duration:</strong> {internship.duration}</p>
                <p><strong>Department:</strong> {internship.departments?.name}</p>
                {internship.stipend && (
                  <p><strong>Stipend:</strong> {internship.stipend}</p>
                )}
                {internship.start_date && (
                  <p><strong>Start Date:</strong> {new Date(internship.start_date).toLocaleDateString()}</p>
                )}
                {internship.end_date && (
                  <p><strong>End Date:</strong> {new Date(internship.end_date).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {internship.requirements && internship.requirements.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <ul className="list-disc list-inside space-y-1">
                  {internship.requirements.map((req, index) => (
                    <li key={index} className="text-sm">{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {internship.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{internship.description}</p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => window.open(internship.internship_link, "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Register Now
          </Button>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
};

export default InternshipDetails;
