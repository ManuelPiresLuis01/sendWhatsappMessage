import nodemailer from "nodemailer";

export function registerSupportRoute(app) {
  app.post("/api/support", async (req, res) => {
    try {
      const { name, email, message } = req.body || {};

      if (!name || !email || !message) {
        return res.status(400).json({ error: "Campos obrigatórios faltando." });
      }

      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = Number(process.env.SMTP_PORT || 587);
      const smtpUser = process.env.EMAIL_USER;
      const smtpPass = process.env.EMAIL_PASS;
      const fromAddress = process.env.SMTP_FROM || smtpUser;
      const supportTo = process.env.SUPPORT_TO || "manuelpiresluis@gmail.com";
      const websiteLink = process.env.CORS_ORIGIN || "";
      const botLink = "https://wa.me/244955758961";

      if (!smtpHost || !smtpUser || !smtpPass) {
        return res.status(500).json({ error: "SMTP não configurado." });
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      const userSubject = "Sua mensagem foi recebida - Uchiha Bot";
      const adminSubject = "Novo pedido de suporte - Uchiha Bot";

      // Footer estilizado moderno
      const footerHtml = `
        <div style="margin-top:40px; padding-top:20px; border-top:1px solid #00ff66; text-align:center; font-size:12px; color:#888;">
          <p style="margin:5px 0;">Equipe <strong>Uchiha Bot</strong></p>
          ${websiteLink ? `<p style="margin:5px 0;"><a href="${websiteLink}" style="color:#00ff66; text-decoration:none;">Visite nosso site</a></p>` : ""}
          <p style="margin:5px 0;"><a href="${botLink}" style="color:#00ff66; text-decoration:none;">Fale com o Uchiha Bot</a></p>
        </div>
      `;

      // HTML estilizado para o usuário
      const userHtml = `
        <div style="font-family: 'Inter', sans-serif; background-color: #121212; color: #e0e0e0; padding:40px; max-width:600px; margin:auto; border-radius:12px;">
          <div style="text-align:center; padding-bottom:20px;">
            <h1 style="margin:0; color:#00ff66; font-size:28px;">Uchiha Bot</h1>
            <p style="margin:5px 0; font-size:16px;">Seu assistente inteligente no WhatsApp</p>
          </div>

          <div style="background: linear-gradient(135deg, #1e1e1e, #222); padding:20px; border-radius:10px; margin-bottom:20px;">
            <p style="font-size:16px;">Olá <strong>${name}</strong>,</p>
            <p>Recebemos sua mensagem e vamos responder o mais rápido possível. Aqui está um resumo do que você enviou:</p>
            <div style="background-color:#181818; padding:15px; border-radius:8px; margin-top:10px; font-size:14px; color:#cfcfcf;">${message}</div>
          </div>

          <div style="text-align:center; margin-top:30px;">
            <a href="${botLink}" style="display:inline-block; background-color:#00ff66; color:#121212; text-decoration:none; padding:12px 25px; border-radius:8px; font-weight:bold;">Abrir WhatsApp</a>
          </div>

          ${footerHtml}
        </div>
      `;

      // HTML estilizado para o admin
      const adminHtml = `
        <div style="font-family: 'Inter', sans-serif; background-color: #121212; color: #e0e0e0; padding:40px; max-width:600px; margin:auto; border-radius:12px;">
          <div style="text-align:center; padding-bottom:20px;">
            <h1 style="margin:0; color:#00ff66; font-size:28px;">Novo Pedido de Suporte</h1>
          </div>

          <div style="background: linear-gradient(135deg, #1e1e1e, #222); padding:20px; border-radius:10px;">
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Mensagem:</strong></p>
            <div style="background-color:#181818; padding:15px; border-radius:8px; font-size:14px; color:#cfcfcf;">${message}</div>
          </div>

          ${footerHtml}
        </div>
      `;

      await transporter.sendMail({ from: fromAddress, to: email, subject: userSubject, html: userHtml });
      await transporter.sendMail({ from: fromAddress, to: supportTo, subject: adminSubject, html: adminHtml });

      return res.json({ ok: true });
    } catch (error) {
      console.error("Falha ao enviar email de suporte", error);
      return res.status(500).json({ error: "Falha ao enviar email de suporte." });
    }
  });
}
