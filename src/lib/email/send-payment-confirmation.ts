import { Resend } from "resend";

if (typeof window !== "undefined") {
  throw new Error("sendPaymentConfirmationEmail solo puede ejecutarse del lado servidor.");
}

export type PaymentConfirmationData = {
  customerName: string;
  customerLastName: string;
  customerEmail: string;
  eventName: string;
  reference: string;
  amount: number;
  currency: string;
  authorizationCode?: string | null;
  paidAt?: string | null;
  productId?: string | null;
};

export type SendEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export async function sendPaymentConfirmationEmail(
  data: PaymentConfirmationData
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.EMAIL_FROM || "SOVOGIN <inscripciones@sovogin.org>";

  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY no configurada. Se omitirá el envío real de correo."
    );
    return {
      success: false,
      error: "RESEND_API_KEY no está configurada en las variables de entorno.",
    };
  }

  const resend = new Resend(apiKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sovogin.com";
  const resultLink = `${siteUrl}/pago/resultado/${encodeURIComponent(data.reference)}`;

  const formattedAmount = new Intl.NumberFormat("es-CO").format(data.amount);
  const formattedDate = data.paidAt
    ? new Date(data.paidAt).toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("es-CO", { dateStyle: "medium" });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 24px; padding: 40px; border: 1px solid #e2e8f0; }
        .header { text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px; }
        .header h1 { font-size: 24px; color: #0f172a; margin: 0 0 8px 0; font-weight: 700; }
        .header p { color: #64748b; font-size: 14px; margin: 0; }
        .content { font-size: 15px; line-height: 1.6; color: #334155; }
        .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 24px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #64748b; }
        .value { font-weight: 700; color: #0f172a; text-align: right; }
        .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; font-weight: 700; padding: 16px 32px; border-radius: 12px; margin-top: 20px; text-align: center; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; pt: 20px; }
      </style>
    </head>
    <body>
      <div className="container">
        <div className="header">
          <h1>Asociación Vallecaucana de Obstetricia y Ginecología</h1>
          <p>SOVOGIN – Confirmación de Inscripción</p>
        </div>
        <div className="content">
          <p>Estimado(a) <strong>${data.customerName} ${data.customerLastName}</strong>,</p>
          <p>Nos complace confirmarle que su inscripción al evento <strong>${data.eventName}</strong> se ha completado exitosamente tras la verificación de su pago por Openpay.</p>
          
          <div className="details-box">
            <div className="detail-row">
              <span className="label">Evento:</span>
              <span className="value">${data.eventName}</span>
            </div>
            <div className="detail-row">
              <span className="label">Referencia de Pago:</span>
              <span className="value" style="font-family: monospace;">${data.reference}</span>
            </div>
            <div className="detail-row">
              <span className="label">Monto Pagado:</span>
              <span className="value">$${formattedAmount} ${data.currency}</span>
            </div>
            ${
              data.authorizationCode
                ? `<div className="detail-row"><span className="label">Código de Autorización:</span><span className="value" style="font-family: monospace;">${data.authorizationCode}</span></div>`
                : ""
            }
            <div className="detail-row">
              <span className="label">Fecha de Confirmación:</span>
              <span className="value">${formattedDate}</span>
            </div>
          </div>

          <p style="text-align: center;">
            <a href="${resultLink}" className="btn">Ver Detalles de la Inscripción</a>
          </p>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
            * Le recomendamos conservar este correo como comprobante oficial de su registro.
          </p>
        </div>
        <div className="footer">
          <p>SOVOGIN – Asociación Vallecaucana de Obstetricia y Ginecología</p>
          <p>Contacto: info@sovogin.org | Cali, Valle del Cauca, Colombia</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data: resData, error: resError } = await resend.emails.send({
      from: fromEmail,
      to: [data.customerEmail],
      subject: `Inscripción confirmada – ${data.eventName}`,
      html: htmlContent,
    });

    if (resError) {
      console.error("Error al enviar correo con Resend:", resError);
      return {
        success: false,
        error: resError.message || "Error devuelto por el servicio Resend.",
      };
    }

    console.log("Correo de confirmación enviado exitosamente:", resData?.id);
    return {
      success: true,
      messageId: resData?.id,
    };
  } catch (err: any) {
    console.error("Excepción enviando correo con Resend:", err);
    return {
      success: false,
      error: err.message || "Error al procesar el envío del correo.",
    };
  }
}
