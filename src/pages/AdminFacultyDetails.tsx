import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Upload, ArrowLeft, Download, Pencil, Trash2, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/DashboardLayout";
import * as XLSX from 'xlsx';

interface Faculty {
  id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  departments?: { name: string };
}

interface Department {
  id: string;
  name: string;
}

const AdminFacultyDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    department_id: "",
  });

  useEffect(() => {
    fetchFaculty();
    fetchDepartments();
  }, []);

  const fetchFaculty = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, departments(name)")
        .eq("role", "faculty")
        .order("full_name");

      if (error) throw error;
      setFaculty(data || []);
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

    if (!formData.full_name || !formData.email || !formData.password || !formData.department_id) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("manage-faculty", {
        body: {
          action: "create_faculty",
          name: formData.full_name,
          email: formData.email,
          password: formData.password,
          department_id: formData.department_id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Success", description: "Faculty member added successfully" });
      setIsDialogOpen(false);
      setFormData({ full_name: "", email: "", password: "", department_id: "" });
      fetchFaculty();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileData = await uploadFile.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        toast({
          title: "Error",
          description: "The uploaded file is empty",
          variant: "destructive",
        });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        try {
          // Convert all fields to strings explicitly to handle Excel numeric data
          const fullName = row.full_name ? String(row.full_name).trim() : '';
          const email = row.email ? String(row.email).trim() : '';
          const password = row.password ? String(row.password).trim() : '';
          const department = row.department ? String(row.department).trim() : '';

          if (!fullName || !email || !password) {
            throw new Error(`Row ${i + 2}: Missing required fields (full_name, email, or password)`);
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            throw new Error(`Row ${i + 2}: Invalid email format`);
          }

          // Validate password length
          if (password.length < 6) {
            throw new Error(`Row ${i + 2}: Password must be at least 6 characters`);
          }

          // Get department ID if department is provided
          let deptId = null;
          if (department) {
            const { data: dept, error: deptError } = await supabase
              .from("departments")
              .select("id")
              .ilike("name", department)
              .single();

            if (deptError || !dept) {
              throw new Error(`Row ${i + 2}: Department "${department}" not found`);
            }
            deptId = dept.id;
          }

          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                full_name: fullName,
                role: 'faculty',
              },
            },
          });

          if (signUpError) throw new Error(`Row ${i + 2}: ${signUpError.message}`);

          if (authData.user && deptId) {
            await supabase
              .from("profiles")
              .update({ department_id: deptId })
              .eq("id", authData.user.id);
          }

          successCount++;
        } catch (err: any) {
          errorCount++;
          errors.push(err.message);
          console.error("Error adding faculty:", err);
        }
      }

      const description = successCount > 0
        ? `Successfully added ${successCount} faculty member(s). ${errorCount > 0 ? `${errorCount} error(s).` : ''}`
        : 'Failed to add any faculty members.';

      toast({
        title: errorCount > 0 ? "Upload Completed with Errors" : "Upload Complete",
        description: description + (errors.length > 0 ? `\n\nFirst error: ${errors[0]}` : ''),
        variant: errorCount > 0 ? "destructive" : "default",
      });

      setIsBulkUploadOpen(false);
      setUploadFile(null);
      fetchFaculty();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to process file: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          department_id: formData.department_id,
        })
        .eq("id", selectedFaculty.id);

      if (error) throw error;

      toast({ title: "Success", description: "Faculty member updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedFaculty(null);
      fetchFaculty();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedFaculty) return;

    try {
      const { data, error } = await supabase.functions.invoke("manage-faculty", {
        body: {
          action: "delete_user",
          user_id: selectedFaculty.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Success", description: "Faculty member deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedFaculty(null);
      fetchFaculty();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setFormData({
      full_name: faculty.full_name,
      email: faculty.email,
      password: "",
      department_id: faculty.department_id || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setIsDeleteDialogOpen(true);
  };

  const openResetPasswordDialog = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setNewPassword("");
    setIsResetPasswordOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedFaculty || newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("manage-faculty", {
        body: {
          action: "reset_password",
          user_id: selectedFaculty.id,
          new_password: newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setIsResetPasswordOpen(false);
      setSelectedFaculty(null);
      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        full_name: "John Doe",
        email: "john.doe@example.com",
        password: "Password123!",
        department: "Computer Science"
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Faculty Template");
    XLSX.writeFile(workbook, "faculty_template.xlsx");

    toast({
      title: "Template Downloaded",
      description: "Please fill in the template with faculty details and upload it back.",
    });
  };

  const filteredFaculty = faculty.filter(f =>
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

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Faculty Details</h1>
          <div className="flex gap-2">
            <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Faculty</DialogTitle>
                  <DialogDescription>
                    Upload an Excel file with faculty details. The file should contain the following columns:
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4 text-sm">
                    <p className="font-semibold mb-2">Required columns:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>full_name</strong>: Full name of the faculty member</li>
                      <li><strong>email</strong>: Valid email address</li>
                      <li><strong>password</strong>: Password for the account (optional, defaults to "defaultPassword123")</li>
                      <li><strong>department</strong>: Department name (must match exactly with existing departments)</li>
                    </ul>
                  </div>
                  <Button variant="outline" onClick={downloadTemplate} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleBulkUpload} className="flex-1" disabled={!uploadFile}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsBulkUploadOpen(false);
                        setUploadFile(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setFormData({ full_name: "", email: "", password: "", department_id: "" })}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Faculty
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Faculty Member</DialogTitle>
                  <DialogDescription>Enter faculty member details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                  <Button type="submit" className="w-full">
                    Add Faculty
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFaculty.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.full_name}</TableCell>
                      <TableCell>{f.email}</TableCell>
                      <TableCell>{f.departments?.name || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(f)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openResetPasswordDialog(f)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(f)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Faculty Member</DialogTitle>
              <DialogDescription>Update faculty member details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <Label htmlFor="edit_full_name">Full Name *</Label>
                <Input
                  id="edit_full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_email">Email (Read-only)</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="edit_department_id">Department *</Label>
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
              <Button type="submit" className="w-full">
                Update Faculty
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>Set a new password for {selectedFaculty?.full_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleResetPassword}>
                  Reset Password
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedFaculty?.full_name}'s account. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminFacultyDetails;
