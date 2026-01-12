import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Pencil, Trash2, KeyRound, Download, Search } from "lucide-react";

interface FacultyProfile {
  id: string;
  department_id: string | null;
}

interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  batch: string | null;
}

const studentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  batch: z.string().trim().min(1).max(50),
});

type BulkStudent = z.infer<typeof studentSchema>;

export default function StudentManager({ profile }: { profile: FacultyProfile }) {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [deptName, setDeptName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<BulkStudent>({ name: "", email: "", password: "", batch: "" });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; batch: string }>({ name: "", email: "", batch: "" });

  // Reset password dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<StudentRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Bulk upload
  const [uploading, setUploading] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const departmentFixed = useMemo(() => profile.department_id, [profile.department_id]);

  useEffect(() => {
    fetchDepartment();
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentFixed]);

  const fetchDepartment = async () => {
    if (!departmentFixed) return;
    const { data } = await (supabase as any).from("departments").select("name").eq("id", departmentFixed).maybeSingle();
    setDeptName(data?.name || "");
  };

  const fetchStudents = async () => {
    if (!departmentFixed) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id, full_name, email, batch")
      .eq("role", "student")
      .eq("department_id", departmentFixed)
      .order("full_name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setStudents((data as any) || []);
    }
    setLoading(false);
  };

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.batch?.toLowerCase().includes(query)
    );
  });

  const createOne = async () => {
    const parsed = studentSchema.safeParse(addForm);
    if (!parsed.success) {
      toast({ title: "Invalid input", description: parsed.error.errors[0]?.message, variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("manage-students", {
        body: { action: "create_one", ...parsed.data, department_id: departmentFixed },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Student created", description: `User ID: ${data?.id || "created"}` });
      setAddOpen(false);
      setAddForm({ name: "", email: "", password: "", batch: "" });
      fetchStudents();
    } catch (e: any) {
      const errorMsg = e.message || "Failed to create student";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  };

  const downloadTemplate = () => {
    const template = [
      { name: "John Doe", batch: "2024", email: "john@example.com", password: "password123" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_template.xlsx");
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      const buf = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as any[];
      const students: BulkStudent[] = [];
      for (const r of rows) {
        const candidate = {
          name: String(r.name ?? r.Name ?? r.full_name ?? "").trim(),
          batch: String(r.batch ?? r.Batch ?? "").trim(),
          email: String(r.email ?? r.Email ?? "").trim(),
          password: String(r.password ?? r.Password ?? "").trim(),
        } as BulkStudent;
        const parsed = studentSchema.safeParse(candidate);
        if (parsed.success) students.push(parsed.data);
      }
      if (students.length === 0) throw new Error("No valid rows found. Columns required: name, batch, email, password");
      const { data, error } = await supabase.functions.invoke("manage-students", {
        body: { action: "bulk_create", students, department_id: departmentFixed },
      });
      if (error) throw error;
      const failures = (data?.results || []).filter((r: any) => r.error);
      toast({
        title: "Bulk upload finished",
        description: failures.length ? `${failures.length} failed. Check emails and try again.` : `All ${students.length} students created`,
      });
      fetchStudents();
      setBulkUploadOpen(false);
      setSelectedFile(null);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (s: StudentRow) => {
    setEditing(s);
    setEditForm({ name: s.full_name || "", email: s.email || "", batch: s.batch || "" });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.name?.trim() || !editForm.email?.trim() || !editForm.batch?.trim()) {
      toast({ title: "Invalid input", description: "Name, email, and batch are required", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("manage-students", {
        body: {
          action: "update_profile",
          user_id: editing.id,
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          batch: editForm.batch.trim(),
          department_id: departmentFixed,
        },
      });
      if (error) throw error;
      toast({ title: "Updated", description: "Student updated" });
      setEditOpen(false);
      setEditing(null);
      fetchStudents();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openReset = (s: StudentRow) => {
    setResetUser(s);
    setNewPassword("");
    setResetOpen(true);
  };

  const doReset = async () => {
    if (!resetUser || newPassword.length < 8) {
      toast({ title: "Invalid password", description: "Minimum 8 characters", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("manage-students", {
        body: { action: "reset_password", user_id: resetUser.id, new_password: newPassword },
      });
      if (error) throw error;
      toast({ title: "Password reset", description: `Password updated for ${resetUser.email}` });
      setResetOpen(false);
      setResetUser(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const doDelete = async (s: StudentRow) => {
    if (!confirm(`Delete ${s.full_name}? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.functions.invoke("manage-students", {
        body: { action: "delete_user", user_id: s.id },
      });
      if (error) throw error;
      toast({ title: "Deleted", description: `${s.full_name} removed` });
      fetchStudents();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <CardTitle>Student Details</CardTitle>
          <CardDescription>
            {deptName ? `Department: ${deptName}` : "Students under your department"}
          </CardDescription>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Student
          </Button>
          <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Bulk Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Table>
          <TableCaption>Students in your department</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.full_name}</TableCell>
                <TableCell>{s.batch || "-"}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openReset(s)}>
                      <KeyRound className="h-4 w-4 mr-1" /> Reset
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => doDelete(s)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredStudents.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {searchQuery ? "No students found matching your search" : "No students yet"}
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Add student dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>Department is fixed to your department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="batch">Batch *</Label>
              <Input id="batch" value={addForm.batch} onChange={(e) => setAddForm({ ...addForm, batch: e.target.value })} placeholder="e.g., 2024" required />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={createOne}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit student dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ename">Full name *</Label>
              <Input id="ename" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="ebatch">Batch *</Label>
              <Input id="ebatch" value={editForm.batch} onChange={(e) => setEditForm({ ...editForm, batch: e.target.value })} placeholder="e.g., 2024" required />
            </div>
            <div>
              <Label htmlFor="eemail">Email *</Label>
              <Input id="eemail" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="npass">New password</Label>
              <Input id="npass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
              <Button onClick={doReset}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk upload dialog */}
      <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Students</DialogTitle>
            <DialogDescription>Upload an Excel file (.xlsx) with student data</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Instructions:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Download the sample template below</li>
                <li>Fill in student data with the following columns in order:</li>
                <ul className="list-disc list-inside ml-6">
                  <li><strong>name</strong> - Student's full name</li>
                  <li><strong>batch</strong> - Student's batch year (e.g., 2024)</li>
                  <li><strong>email</strong> - Student's email address</li>
                  <li><strong>password</strong> - Student's password (minimum 8 characters)</li>
                </ul>
                <li>All fields are mandatory</li>
                <li>Choose the file and click Upload to add students</li>
              </ol>
            </div>
            
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Sample Template
            </Button>

            <div>
              <Label htmlFor="file">Choose Excel File</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setBulkUploadOpen(false);
                setSelectedFile(null);
              }} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleBulkUpload} disabled={!selectedFile || uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
