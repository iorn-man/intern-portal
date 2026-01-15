// Follow this setup: https://supabase.com/docs/guides/functions

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Create admin client with service role key
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Verify the requesting user is an admin
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "No authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Check if user is admin
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return new Response(JSON.stringify({ error: "Only admins can manage faculty" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        const { action, user_id, new_password, name, email, password, department_id } = body;

        let result: any = {};

        switch (action) {
            case "reset_password":
                if (!user_id || !new_password) {
                    return new Response(JSON.stringify({ error: "user_id and new_password are required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
                    password: new_password,
                });

                if (resetError) {
                    return new Response(JSON.stringify({ error: resetError.message }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                result = { success: true, message: "Password reset successfully" };
                break;

            case "delete_user":
                if (!user_id) {
                    return new Response(JSON.stringify({ error: "user_id is required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

                if (deleteError) {
                    return new Response(JSON.stringify({ error: deleteError.message }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                result = { success: true, message: "User deleted successfully" };
                break;

            case "create_faculty":
                if (!name || !email || !password) {
                    return new Response(JSON.stringify({ error: "name, email, and password are required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: email,
                    password: password,
                    email_confirm: true,
                    user_metadata: {
                        full_name: name,
                        role: "faculty",
                    },
                });

                if (createError) {
                    return new Response(JSON.stringify({ error: createError.message }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                // Update profile with department if provided
                if (newUser?.user && department_id) {
                    await supabaseAdmin
                        .from("profiles")
                        .update({ department_id: department_id })
                        .eq("id", newUser.user.id);
                }

                result = { success: true, id: newUser?.user?.id, message: "Faculty created successfully" };
                break;

            case "update_profile":
                if (!user_id) {
                    return new Response(JSON.stringify({ error: "user_id is required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                const updateData: any = {};
                if (name) updateData.full_name = name;
                if (department_id) updateData.department_id = department_id;

                const { error: updateError } = await supabaseAdmin
                    .from("profiles")
                    .update(updateData)
                    .eq("id", user_id);

                if (updateError) {
                    return new Response(JSON.stringify({ error: updateError.message }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                result = { success: true, message: "Profile updated successfully" };
                break;

            default:
                return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
