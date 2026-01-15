import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Internship {
  id: string;
  company_name: string;
  domain: string;
  title: string;
  duration: string;
  department_id: string;
  internship_link: string;
  is_active: boolean;
  departments?: { name: string };
}

interface Department {
  id: string;
  name: string;
}

const Internships = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);

  const [formData, setFormData] = useState({
    company_name: "",
    domain: "",
    title: "",
    duration: "",
    department_id: "",
    internship_link: "",
    description: "",
  });

  useEffect(() => {
    fetchInternships();
    fetchDepartments();
  }, []);

  const fetchInternships = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user's role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // Build query based on role
      let query = supabase
        .from("internships")
        .select("*, departments(name)")
        .order("created_at", { ascending: false });

      // If not admin, filter by faculty_id
      if (profile?.role !== 'admin') {
        query = query.eq("faculty_id", user.id);
      }

      const { data, error } = await query;

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

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name || !formData.domain ||
      !formData.duration || !formData.department_id || !formData.internship_link) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (editingInternship) {
        const { error } = await supabase
          .from("internships")
          .update({
            company_name: formData.company_name,
            domain: formData.domain,
            title: formData.title,
            duration: formData.duration,
            department_id: formData.department_id,
            internship_link: formData.internship_link,
            description: formData.description,
          })
          .eq("id", editingInternship.id);

        if (error) throw error;
        toast({ title: "Success", description: "Internship updated successfully" });
      } else {
        const { data: newInternship, error } = await supabase
          .from("internships")
          .insert({
            company_name: formData.company_name,
            domain: formData.domain,
            title: formData.title,
            duration: formData.duration,
            department_id: formData.department_id,
            internship_link: formData.internship_link,
            description: formData.description,
            faculty_id: user.id,
            posted_by: profile?.full_name || user.email || "Unknown",
          })
          .select()
          .single();

        if (error) throw error;

        // Send email notifications to department students
        try {
          const { error: emailError } = await supabase.functions.invoke('send-internship-notification', {
            body: {
              internship_id: newInternship.id,
              department_id: formData.department_id,
            },
          });

          if (emailError) {
            console.error('Error sending email notifications:', emailError);
            toast({
              title: "Warning",
              description: "Internship posted but email notifications failed",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Success",
              description: "Internship posted and email notifications sent to students"
            });
          }
        } catch (emailErr) {
          console.error('Error invoking email function:', emailErr);
          toast({
            title: "Success",
            description: "Internship posted successfully (email notifications pending)"
          });
        }
      }

      setIsDialogOpen(false);
      setEditingInternship(null);
      setFormData({
        company_name: "",
        domain: "",
        title: "",
        duration: "",
        department_id: "",
        internship_link: "",
        description: "",
      });
      fetchInternships();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (internship: Internship) => {
    setEditingInternship(internship);
    setFormData({
      company_name: internship.company_name,
      domain: internship.domain,
      title: internship.title,
      duration: internship.duration,
      department_id: internship.department_id,
      internship_link: internship.internship_link,
      description: "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this internship?")) return;

    try {
      // First, delete related applications
      await supabase
        .from("applications")
        .delete()
        .eq("internship_id", id);

      // Then delete the internship
      const { data, error } = await supabase
        .from("internships")
        .delete()
        .eq("id", id)
        .select();

      if (error) throw error;

      // Check if any row was actually deleted
      if (!data || data.length === 0) {
        toast({
          title: "Error",
          description: "Could not delete internship. You may not have permission.",
          variant: "destructive"
        });
        return;
      }

      toast({ title: "Success", description: "Internship deleted successfully" });
      fetchInternships();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete internship",
        variant: "destructive",
      });
    }
  };

  const filteredInternships = internships.filter(internship =>
    internship.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    internship.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    internship.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    internship.departments?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFormValid = formData.company_name && formData.domain &&
    formData.duration && formData.department_id && formData.internship_link;

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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Internships</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingInternship(null);
                setFormData({
                  company_name: "",
                  domain: "",
                  title: "",
                  duration: "",
                  department_id: "",
                  internship_link: "",
                  description: "",
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Post Internship
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingInternship ? "Edit" : "Post"} Internship</DialogTitle>
                <DialogDescription>Fill in the internship details</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="domain">Domain *</Label>
                  <Input
                    id="domain"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="title">Role</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration *</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 3 months"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department_id">Department *</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="internship_link">Internship Link *</Label>
                  <Input
                    id="internship_link"
                    type="url"
                    value={formData.internship_link}
                    onChange={(e) => setFormData({ ...formData, internship_link: e.target.value })}
                    placeholder="https://example.com/apply"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={!isFormValid} className="w-full">
                  {editingInternship ? "Update" : "Upload"} Internship
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
            No internships found
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredInternships.map((internship) => (
              <Card key={internship.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{internship.company_name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(internship)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(internship.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>{internship.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm"><strong>Domain:</strong> {internship.domain}</p>
                  <p className="text-sm"><strong>Duration:</strong> {internship.duration}</p>
                  <p className="text-sm"><strong>Department:</strong> {internship.departments?.name}</p>
                  <p className="text-sm">
                    <strong>Status:</strong>{" "}
                    <span className={internship.is_active ? "text-green-600" : "text-red-600"}>
                      {internship.is_active ? "Active" : "Inactive"}
                    </span>
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

export default Internships;
