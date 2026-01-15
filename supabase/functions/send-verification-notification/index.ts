// Edge function to send email to faculty when student submits verification request

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
        const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

        if (!gmailAppPassword) {
            console.error("GMAIL_APP_PASSWORD not configured");
            return new Response(JSON.stringify({ error: "Email service not configured" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Verify requesting user (must be a student)
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

        const body = await req.json();
        const { certificate_id, student_name, student_email, internship_title, company_name, department_id } = body;

        if (!certificate_id || !department_id) {
            return new Response(JSON.stringify({ error: "certificate_id and department_id are required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get all faculty in the department
        const { data: facultyList, error: facultyError } = await supabaseAdmin
            .from("profiles")
            .select("email, full_name")
            .eq("role", "faculty")
            .eq("department_id", department_id);

        if (facultyError || !facultyList || facultyList.length === 0) {
            console.log("No faculty found in department:", department_id);
            return new Response(JSON.stringify({ message: "No faculty found in department", sent: 0 }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Setup SMTP client
        const client = new SMTPClient({
            connection: {
                hostname: "smtp.gmail.com",
                port: 465,
                tls: true,
                auth: {
                    username: "internportal.neo@gmail.com",
                    password: gmailAppPassword,
                },
            },
        });

        let sentCount = 0;
        const errors: string[] = [];

        for (const faculty of facultyList) {
            try {
                await client.send({
                    from: "Intern Portal <internportal.neo@gmail.com>",
                    to: faculty.email,
                    subject: `Certificate Verification Request: ${student_name} - ${internship_title}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">🎓 Certificate Verification Request</h2>
              <p>Dear ${faculty.full_name || 'Faculty'},</p>
              <p>A student from your department has submitted a certificate for verification:</p>
              
              <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1F2937;">Student Details</h3>
                <p><strong>Name:</strong> ${student_name}</p>
                <p><strong>Email:</strong> ${student_email}</p>
                <h3 style="color: #1F2937;">Internship Details</h3>
                <p><strong>Title:</strong> ${internship_title}</p>
                <p><strong>Company:</strong> ${company_name}</p>
              </div>
              
              <p>Please log in to the Intern Portal to review and verify the certificate.</p>
              
              <div style="margin: 30px 0;">
                <a href="https://intern-portal-git.vercel.app/certificate-centre/${department_id}" 
                   style="background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
                  View Certificate
                </a>
              </div>
              
              <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
                This is an automated message from the Intern Portal. Please do not reply to this email.
              </p>
            </div>
          `,
                });
                sentCount++;
            } catch (e: any) {
                console.error(`Failed to send to ${faculty.email}:`, e);
                errors.push(faculty.email);
            }
        }

        await client.close();

        return new Response(JSON.stringify({
            success: true,
            sent: sentCount,
            failed: errors.length,
            total: facultyList.length
        }), {
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
