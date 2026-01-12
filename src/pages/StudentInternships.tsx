import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, ExternalLink, ArrowLeft } from "lucide-react";
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
  departments?: { name: string };
}

const StudentInternships = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInternships();
  }, []);

  const fetchInternships = async () => {
    try {
      const { data, error } = await supabase
        .from("internships")
        .select("*, departments(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInternships(data || []);
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

  const filteredInternships = internships.filter(internship =>
    internship.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    internship.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    internship.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    internship.departments?.name?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <h1 className="text-3xl font-bold">Available Internships</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by company, domain, role, or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredInternships.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No internships available
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInternships.map((internship) => (
            <Card
              key={internship.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/internship-details/${internship.id}`)}
            >
              <CardHeader>
                <CardTitle>{internship.company_name}</CardTitle>
                <CardDescription>{internship.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm"><strong>Domain:</strong> {internship.domain}</p>
                <p className="text-sm"><strong>Duration:</strong> {internship.duration}</p>
                <p className="text-sm"><strong>Department:</strong> {internship.departments?.name}</p>
                {internship.stipend && (
                  <p className="text-sm"><strong>Stipend:</strong> {internship.stipend}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Click to view details
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
};

export default StudentInternships;
