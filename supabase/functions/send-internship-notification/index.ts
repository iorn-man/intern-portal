// Edge function to send email when new internship is posted

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

        const body = await req.json();
        const { internship_id, department_id } = body;

        if (!internship_id || !department_id) {
            return new Response(JSON.stringify({ error: "internship_id and department_id are required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get internship details
        const { data: internship, error: internshipError } = await supabaseAdmin
            .from("internships")
            .select("title, company_name, description, location, duration, stipend")
            .eq("id", internship_id)
            .single();

        if (internshipError || !internship) {
            return new Response(JSON.stringify({ error: "Internship not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get all students in the department
        const { data: students, error: studentsError } = await supabaseAdmin
            .from("profiles")
            .select("email, full_name")
            .eq("role", "student")
            .eq("department_id", department_id);

        if (studentsError || !students || students.length === 0) {
            return new Response(JSON.stringify({ message: "No students found in department", sent: 0 }), {
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

        for (const student of students) {
            try {
                await client.send({
                    from: "Intern Portal <internportal.neo@gmail.com>",
                    to: student.email,
                    subject: `New Internship Opportunity: ${internship.title} at ${internship.company_name}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">New Internship Opportunity!</h2>
              <p>Dear ${student.full_name || 'Student'},</p>
              <p>A new internship opportunity is available for your department:</p>
              
              <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1F2937;">${internship.title}</h3>
                <p><strong>Company:</strong> ${internship.company_name}</p>
                ${internship.location ? `<p><strong>Location:</strong> ${internship.location}</p>` : ''}
                ${internship.duration ? `<p><strong>Duration:</strong> ${internship.duration}</p>` : ''}
                ${internship.stipend ? `<p><strong>Stipend:</strong> ₹${internship.stipend}/month</p>` : ''}
                ${internship.description ? `<p><strong>Description:</strong> ${internship.description.substring(0, 200)}...</p>` : ''}
              </div>
              
              <p>Log in to the Intern Portal to apply now!</p>
              
              <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
                This is an automated message from the Intern Portal. Please do not reply to this email.
              </p>
            </div>
          `,
                });
                sentCount++;
            } catch (e: any) {
                console.error(`Failed to send to ${student.email}:`, e);
                errors.push(student.email);
            }
        }

        await client.close();

        return new Response(JSON.stringify({
            success: true,
            sent: sentCount,
            failed: errors.length,
            total: students.length
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
