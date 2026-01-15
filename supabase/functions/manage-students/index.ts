// Follow this setup: https://supabase.com/docs/guides/functions

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Verify requesting user
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

        // Check if user is admin or faculty
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role, department_id")
            .eq("id", user.id)
            .single();

        if (!profile || (profile.role !== "admin" && profile.role !== "faculty")) {
            return new Response(JSON.stringify({ error: "Only admin or faculty can manage students" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        const { action, user_id, name, email, password, batch, department_id, new_password, students } = body;

        // For faculty, restrict to their own department
        const targetDeptId = profile.role === "admin" ? department_id : profile.department_id;

        let result: any = {};

        switch (action) {
            case "create_one":
                if (!name || !email || !password || !batch) {
                    return new Response(JSON.stringify({ error: "name, email, password, and batch are required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                const { data: newStudent, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: email,
                    password: password,
                    email_confirm: true,
                    user_metadata: {
                        full_name: name,
                        role: "student",
                    },
                });

                if (createError) {
                    return new Response(JSON.stringify({ error: createError.message }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                if (newStudent?.user) {
                    await supabaseAdmin
                        .from("profiles")
                        .update({ department_id: targetDeptId, batch: batch })
                        .eq("id", newStudent.user.id);
                }

                result = { success: true, id: newStudent?.user?.id };
                break;

            case "bulk_create":
                if (!students || !Array.isArray(students) || students.length === 0) {
                    return new Response(JSON.stringify({ error: "students array is required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                const results: any[] = [];
                for (const student of students) {
                    try {
                        const { data: created, error: bulkError } = await supabaseAdmin.auth.admin.createUser({
                            email: student.email,
                            password: student.password,
                            email_confirm: true,
                            user_metadata: {
                                full_name: student.name,
                                role: "student",
                            },
                        });

                        if (bulkError) {
                            results.push({ email: student.email, error: bulkError.message });
                        } else if (created?.user) {
                            await supabaseAdmin
                                .from("profiles")
                                .update({ department_id: targetDeptId, batch: student.batch })
                                .eq("id", created.user.id);
                            results.push({ email: student.email, id: created.user.id, success: true });
                        }
                    } catch (e: any) {
                        results.push({ email: student.email, error: e.message });
                    }
                }
                result = { results };
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
                if (batch) updateData.batch = batch;
                if (department_id && profile.role === "admin") updateData.department_id = department_id;

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

                // Update email in auth if provided
                if (email) {
                    await supabaseAdmin.auth.admin.updateUserById(user_id, { email });
                }

                result = { success: true };
                break;

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

                result = { success: true };
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

                result = { success: true };
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
