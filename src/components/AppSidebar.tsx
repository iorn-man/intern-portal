import React from "react";
import { Home, Users, Briefcase, Building2, Award, TrendingUp, FileText, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  role: "student" | "faculty" | "admin";
}

export function AppSidebar({ role }: AppSidebarProps) {
  const { open, setOpen } = useSidebar();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50 transition-colors";

  const studentItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Internships", url: "/student-internships", icon: Briefcase },
    { title: "Active Internships", url: "/active-internships", icon: TrendingUp },
    { title: "Certificate Center", url: "/student-certificate-center", icon: Award },
    { title: "Profile", url: "/student-profile", icon: Users },
  ];

  const facultyItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Internships", url: "/internships", icon: Briefcase },
    { title: "Active Internships", url: "/faculty-active-internships", icon: TrendingUp },
    { title: "Completed Internships", url: "/faculty-completed-internships", icon: FileText },
    { title: "Student Data", url: "/student-data", icon: Users },
    { title: "Student Progress", url: "/student-progress", icon: TrendingUp },
    { title: "Certificate Center", url: "/certificate-centre", icon: Award },
  ];

  const adminItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Student Management", url: "/admin-student-management", icon: Users },
    { title: "Faculty Management", url: "/admin-faculty-management", icon: Users },
    { title: "Internship Management", url: "/admin-internship-management", icon: Briefcase },
    { title: "Department Management", url: "/admin-department-management", icon: Building2 },
  ];

  const items = role === "student" ? studentItems : role === "faculty" ? facultyItems : adminItems;

  return (
    <Sidebar 
      collapsible="icon"
      className="pt-16"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
