import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  to: string;
  subject: string;
  title: string;
  message: string;
  link?: string;
  type: "info" | "warning" | "alert" | "success" | "critical";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resend = new Resend(resendApiKey);
    const { to, subject, title, message, link, type }: NotificationRequest = await req.json();

    const typeColors = {
      info: "#1C3F60",
      success: "#1DB954",
      warning: "#F7B500",
      alert: "#FF8C00",
      critical: "#E63946",
    };

    const typeLabels = {
      info: "Information",
      success: "Succès",
      warning: "Attention",
      alert: "Alerte",
      critical: "Critique",
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1C3F60 0%, #2a5478 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">B8ild</h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; opacity: 0.9; font-size: 14px;">Gestion de chantiers BTP</p>
            </td>
          </tr>
          
          <!-- Type Badge -->
          <tr>
            <td style="padding: 24px 32px 0 32px;">
              <div style="display: inline-block; background-color: ${typeColors[type]}; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                ${typeLabels[type]}
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px; font-weight: 700;">${title}</h2>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.6;">${message}</p>
            </td>
          </tr>
          
          ${link ? `
          <!-- CTA Button -->
          <tr>
            <td style="padding: 8px 32px 32px 32px;">
              <a href="${link}" style="display: inline-block; background-color: #1C3F60; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">
                Voir les détails
              </a>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #999999; font-size: 14px;">
                © ${new Date().getFullYear()} B8ild - Tous droits réservés
              </p>
              <p style="margin: 8px 0 0 0; color: #999999; font-size: 12px;">
                Vous recevez cet email car vous avez un compte B8ild actif.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "B8ild <notifications@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
