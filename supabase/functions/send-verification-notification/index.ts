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

        console.log("Starting verification notification...");

        if (!gmailAppPassword) {
            console.error("GMAIL_APP_PASSWORD not configured");
            return new Response(JSON.stringify({ error: "Email service not configured" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            console.error("No authorization header provided");
            return new Response(JSON.stringify({ error: "No authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            console.error("Invalid token:", authError);
            return new Response(JSON.stringify({ error: "Invalid token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        console.log("Request body:", JSON.stringify(body));

        const { certificate_id, student_name, student_email, internship_title, company_name, department_id } = body;

        if (!certificate_id || !department_id) {
            console.error("Missing required fields:", { certificate_id, department_id });
            return new Response(JSON.stringify({ error: "certificate_id and department_id are required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log("Looking for faculty in department:", department_id);

        const { data: facultyList, error: facultyError } = await supabaseAdmin
            .from("profiles")
            .select("email, full_name")
            .eq("role", "faculty")
            .eq("department_id", department_id);

        if (facultyError) {
            console.error("Error fetching faculty:", facultyError);
            return new Response(JSON.stringify({ error: "Error fetching faculty" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!facultyList || facultyList.length === 0) {
            console.log("No faculty found in department:", department_id);
            return new Response(JSON.stringify({ message: "No faculty found in department", sent: 0 }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log("Found " + facultyList.length + " faculty members");

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

        const buildEmail = (facultyName: string) => {
            const sName = student_name || 'Student';
            const sEmail = student_email || '';
            const iTitle = internship_title || 'Internship';
            const cName = company_name || 'Company';

            let html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>';
            html += '<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">';
            html += '<table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">';
            html += '<tr><td align="center">';
            html += '<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;">';

            // Header
            html += '<tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:25px;text-align:center;border-radius:8px 8px 0 0;">';
            html += '<h1 style="margin:0;color:#fff;font-size:22px;font-weight:normal;">';
            html += '<span style="margin-right:8px;">&#127891;</span>Certificate Verification Request</h1>';
            html += '</td></tr>';

            // Body
            html += '<tr><td style="padding:30px;">';
            html += '<p style="margin:0 0 20px;font-size:16px;color:#333;">Dear <b>' + facultyName + '</b>,</p>';
            html += '<p style="margin:0 0 25px;font-size:15px;color:#555;line-height:1.5;">';
            html += 'A student from your department has completed their internship and submitted a certificate for verification.</p>';

            // Student Details Box
            html += '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:20px;">';
            html += '<tr><td style="padding:20px;">';
            html += '<h3 style="margin:0 0 15px;color:#166534;font-size:16px;">Student Details</h3>';
            html += '<table width="100%" cellpadding="0" cellspacing="0">';
            html += '<tr><td style="padding:6px 0;font-size:14px;"><b style="color:#059669;">Name:</b> <span style="color:#333;">' + sName + '</span></td></tr>';
            html += '<tr><td style="padding:6px 0;font-size:14px;"><b style="color:#059669;">Email:</b> <span style="color:#333;">' + sEmail + '</span></td></tr>';
            html += '</table></td></tr></table>';

            // Internship Details Box
            html += '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;margin-bottom:25px;">';
            html += '<tr><td style="padding:20px;">';
            html += '<h3 style="margin:0 0 15px;color:#0369a1;font-size:16px;">Internship Details</h3>';
            html += '<table width="100%" cellpadding="0" cellspacing="0">';
            html += '<tr><td style="padding:6px 0;font-size:14px;"><b style="color:#0284c7;">Title:</b> <span style="color:#333;">' + iTitle + '</span></td></tr>';
            html += '<tr><td style="padding:6px 0;font-size:14px;"><b style="color:#0284c7;">Company:</b> <span style="color:#333;">' + cName + '</span></td></tr>';
            html += '</table></td></tr></table>';

            html += '<p style="margin:0 0 25px;font-size:14px;color:#555;line-height:1.5;">';
            html += 'Please log in to the Intern Portal to <b>review and verify</b> the certificate.</p>';

            // Button
            html += '<table cellpadding="0" cellspacing="0" style="margin:0 auto;">';
            html += '<tr><td style="background:#10b981;border-radius:5px;">';
            html += '<a href="https://intern-portal-git.vercel.app" style="display:inline-block;padding:12px 30px;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;">Review Certificate</a>';
            html += '</td></tr></table>';

            html += '</td></tr>';

            // Footer
            html += '<tr><td style="padding:20px;text-align:center;border-top:1px solid #eee;">';
            html += '<p style="margin:0 0 5px;font-size:12px;color:#999;">This is an automated notification from the Internship Portal</p>';
            html += '<p style="margin:0;font-size:12px;color:#999;">Please do not reply to this email</p>';
            html += '</td></tr>';

            html += '</table></td></tr></table></body></html>';
            return html;
        };

        for (const faculty of facultyList) {
            try {
                console.log("Sending email to: " + faculty.email);
                await client.send({
                    from: "Internship Portal <internportal.neo@gmail.com>",
                    to: faculty.email,
                    subject: "Certificate Verification: " + (student_name || 'Student') + " - " + (internship_title || 'Internship'),
                    html: buildEmail(faculty.full_name || 'Faculty'),
                });
                sentCount++;
                console.log("Email sent successfully to: " + faculty.email);
            } catch (e: any) {
                console.error("Failed to send to " + faculty.email + ":", e);
                errors.push(faculty.email);
            }
        }

        await client.close();

        console.log("Completed. Sent: " + sentCount + ", Failed: " + errors.length);

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
