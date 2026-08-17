import { Resend } from "resend";

if (typeof window !== "undefined") {
  throw new Error("sendAssociateInviteEmail solo puede ejecutarse del lado servidor.");
}

export type AssociateInviteEmailData = {
  associateName: string;
  associateEmail: string;
  activationLink: string;
};

export type SendEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export async function sendAssociateInviteEmail(
  data: AssociateInviteEmailData
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.EMAIL_FROM || "SOVOGIN <info@sovogin.org>";

  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY no configurada. Se omitirá el envío del correo de activación del Portal del Asociado."
    );
    return {
      success: false,
      error: "RESEND_API_KEY no está configurada en las variables de entorno.",
    };
  }

  const resend = new Resend(apiKey);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; bg-color: #ffffff; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff; }
        .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; margin: 0; }
        .subtitle { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #006666; font-weight: 700; margin-top: 4px; }
        .content { padding: 36px 32px; color: #334155; line-height: 1.6; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
        .btn { display: inline-block; background-color: #006666; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; margin: 24px 0; text-align: center; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div className="container">
        <div className="header">
          <div className="logo">SOVOGIN</div>
          <div className="subtitle">Asociación Vallecaucana de Obstetricia y Ginecología</div>
        </div>
        <div className="content">
          <h2 className="title">Activación de Cuenta - Portal del Asociado</h2>
          <p>Estimado(a) <strong>${data.associateName}</strong>,</p>
          <p>La Junta Directiva de SOVOGIN le da la bienvenida al nuevo <strong>Portal del Asociado</strong>. A través de esta plataforma privada podrá acceder a sus beneficios gremiales, recursos académicos exclusivos y gestionar su perfil profesional.</p>
          <p>Para activar su cuenta e ingresar su contraseña privada de acceso, por favor haga clic en el siguiente botón:</p>
          <div style="text-align: center;">
            <a href="${data.activationLink}" class="btn">Activar Mi Cuenta en el Portal</a>
          </div>
          <p style="font-size: 13px; color: #64748b;">Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br>
          <a href="${data.activationLink}" style="color: #006666; word-break: break-all;">${data.activationLink}</a></p>
        </div>
        <div className="footer">
          <p>© ${new Date().getFullYear()} SOVOGIN. Todos los derechos reservados.<br>
          Calle 20 Norte No. 6N – 33, Cali – Valle del Cauca, Colombia.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data: resData, error: resError } = await resend.emails.send({
      from: fromEmail,
      to: [data.associateEmail],
      subject: "Invitación al Portal del Asociado - SOVOGIN",
      html: htmlContent,
    });

    if (resError) {
      console.error("Error al enviar email con Resend:", resError);
      return { success: false, error: resError.message };
    }

    return { success: true, messageId: resData?.id };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Excepción desconocida al enviar email.";
    console.error("Excepción en sendAssociateInviteEmail:", errMsg);
    return { success: false, error: errMsg };
  }
}
