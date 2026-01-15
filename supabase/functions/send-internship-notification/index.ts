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

    const { data: internship, error: internshipError } = await supabaseAdmin
      .from("internships")
      .select("title, company_name, description, location, duration, stipend, internship_link, domain")
      .eq("id", internship_id)
      .single();

    if (internshipError || !internship) {
      return new Response(JSON.stringify({ error: "Internship not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: department } = await supabaseAdmin
      .from("departments")
      .select("name")
      .eq("id", department_id)
      .single();

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

    const buildEmail = (name: string) => {
      const c = internship.company_name || '';
      const t = internship.title || '';
      const d = internship.domain || '';
      const dur = internship.duration || '';
      const dept = department?.name || '';
      const link = internship.internship_link || 'https://intern-portal-git.vercel.app';

      let html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>';
      html += '<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">';
      html += '<table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">';
      html += '<tr><td align="center">';
      html += '<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;">';

      // Header
      html += '<tr><td style="background:#4285f4;padding:25px;text-align:center;border-radius:8px 8px 0 0;">';
      html += '<h1 style="margin:0;color:#fff;font-size:22px;font-weight:normal;">';
      html += '<span style="margin-right:8px;">&#127919;</span>New Internship Opportunity!</h1>';
      html += '</td></tr>';

      // Body
      html += '<tr><td style="padding:30px;">';
      html += '<p style="margin:0 0 20px;font-size:16px;color:#333;">Hello!</p>';
      html += '<p style="margin:0 0 25px;font-size:15px;color:#555;line-height:1.5;">';
      html += 'A new internship has been posted for your department. Here are the details:</p>';

      // Details
      html += '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:25px;">';
      if (c) html += '<tr><td style="padding:8px 0;font-size:14px;"><span style="color:#4285f4;font-weight:bold;">Company:</span> <span style="color:#333;">' + c + '</span></td></tr>';
      if (t) html += '<tr><td style="padding:8px 0;font-size:14px;"><span style="color:#4285f4;font-weight:bold;">Title:</span> <span style="color:#333;">' + t + '</span></td></tr>';
      if (d) html += '<tr><td style="padding:8px 0;font-size:14px;"><span style="color:#4285f4;font-weight:bold;">Domain:</span> <span style="color:#333;">' + d + '</span></td></tr>';
      if (dur) html += '<tr><td style="padding:8px 0;font-size:14px;"><span style="color:#4285f4;font-weight:bold;">Duration:</span> <span style="color:#333;">' + dur + '</span></td></tr>';
      if (dept) html += '<tr><td style="padding:8px 0;font-size:14px;"><span style="color:#4285f4;font-weight:bold;">Department:</span> <span style="color:#333;">' + dept + '</span></td></tr>';
      html += '</table>';

      html += '<p style="margin:0 0 25px;font-size:14px;color:#555;line-height:1.5;">';
      html += 'Log in to your account to view <b>complete details</b> and apply for this opportunity!</p>';

      // Button
      html += '<table cellpadding="0" cellspacing="0" style="margin:0 auto;">';
      html += '<tr><td style="background:#4285f4;border-radius:5px;">';
      html += '<a href="' + link + '" style="display:inline-block;padding:12px 30px;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;">View Internship</a>';
      html += '</td></tr></table>';

      html += '</td></tr>';

      // Footer
      html += '<tr><td style="padding:20px;text-align:center;border-top:1px solid #eee;">';
      html += '<p style="margin:0 0 5px;font-size:12px;color:#999;">This is an automated notification from the Internship Portal</p>';
      html += '<p style="margin:0;font-size:12px;color:#999;">Please do not reply to <b>this email</b></p>';
      html += '</td></tr>';

      html += '</table></td></tr></table></body></html>';
      return html;
    };

    for (const student of students) {
      try {
        await client.send({
          from: "Internship Portal <internportal.neo@gmail.com>",
          to: student.email,
          subject: "New Internship Opportunity: " + (internship.title || 'Check it out') + " at " + internship.company_name,
          html: buildEmail(student.full_name || 'Student'),
        });
        sentCount++;
      } catch (e: any) {
        console.error("Failed to send to " + student.email + ":", e);
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
