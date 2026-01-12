import { supabase as base } from "@/integrations/supabase/client";

// Export an untyped Supabase client to avoid build-time type issues when Database types are unavailable
export const supabase = base as any;

