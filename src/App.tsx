import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Internships from "./pages/Internships";
import StudentProgress from "./pages/StudentProgress";
import CertificateCentre from "./pages/CertificateCentre";
import StudentData from "./pages/StudentData";
import StudentInternships from "./pages/StudentInternships";
import InternshipDetails from "./pages/InternshipDetails";
import ActiveInternships from "./pages/ActiveInternships";
import InternshipDetail from "./pages/InternshipDetail";
import StudentCertificateCenter from "./pages/StudentCertificateCenter";
import StudentProfile from "./pages/StudentProfile";
import FacultyActiveInternships from "./pages/FacultyActiveInternships";
import FacultyCompletedInternships from "./pages/FacultyCompletedInternships";
import AdminStudentManagement from "./pages/AdminStudentManagement";
import AdminFacultyManagement from "./pages/AdminFacultyManagement";
import AdminInternshipManagement from "./pages/AdminInternshipManagement";
import AdminDepartmentManagement from "./pages/AdminDepartmentManagement";
import AdminFacultyDetails from "./pages/AdminFacultyDetails";
import AdminFacultyProgress from "./pages/AdminFacultyProgress";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/internships" element={<Internships />} />
            <Route path="/student-progress" element={<StudentProgress />} />
            <Route path="/student-progress/:departmentId" element={<StudentProgress />} />
            <Route path="/certificate-center" element={<CertificateCentre />} />
            <Route path="/certificate-center/:departmentId" element={<CertificateCentre />} />
            <Route path="/certificate-centre" element={<CertificateCentre />} />
            <Route path="/certificate-centre/:departmentId" element={<CertificateCentre />} />
            <Route path="/student-data" element={<StudentData />} />
            <Route path="/student-data/:departmentId" element={<StudentData />} />
            <Route path="/student-internships" element={<StudentInternships />} />
            <Route path="/internship-details/:id" element={<InternshipDetails />} />
            <Route path="/active-internships" element={<ActiveInternships />} />
            <Route path="/internship-detail/:id" element={<InternshipDetail />} />
            <Route path="/student-certificate-center" element={<StudentCertificateCenter />} />
            <Route path="/student-profile" element={<StudentProfile />} />
            <Route path="/faculty-active-internships" element={<FacultyActiveInternships />} />
            <Route path="/faculty-completed-internships" element={<FacultyCompletedInternships />} />
            <Route path="/admin-student-management" element={<AdminStudentManagement />} />
            <Route path="/admin-faculty-management" element={<AdminFacultyManagement />} />
            <Route path="/admin-internship-management" element={<AdminInternshipManagement />} />
            <Route path="/admin-department-management" element={<AdminDepartmentManagement />} />
            <Route path="/admin-faculty-details" element={<AdminFacultyDetails />} />
            <Route path="/admin-faculty-progress" element={<AdminFacultyProgress />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
