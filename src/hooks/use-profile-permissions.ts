import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-helpers";

export interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id: string | null;
  phone?: string | null;
  resume_url?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  preferred_domains?: string[] | null;
}

export const useProfilePermissions = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        
        // Get user role
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        
        if (profileData) {
          setCurrentUserRole(profileData.role);
        }
      }
    };
    getUser();
  }, []);

  const filterSensitiveData = (profile: ProfileData, context?: {
    isApplicantToOwnInternship?: boolean;
  }): ProfileData => {
    // If viewing own profile, show everything
    if (profile.id === currentUserId) {
      return profile;
    }

    // If admin, show everything
    if (currentUserRole === 'admin') {
      return profile;
    }

    // If faculty and user is an applicant to their internship, show resume_url
    if (currentUserRole === 'faculty' && context?.isApplicantToOwnInternship) {
      return {
        ...profile,
        phone: undefined,
        email: undefined,
      };
    }

    // For all other cases, hide sensitive data
    return {
      ...profile,
      phone: undefined,
      email: undefined,
      resume_url: undefined,
    };
  };

  return {
    currentUserId,
    currentUserRole,
    filterSensitiveData,
  };
};
