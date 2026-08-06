import nodemailer from 'nodemailer';
import prisma from '../db';

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    // 1. Fetch settings from DB
    const settingsRaw = await prisma.setting.findMany();
    const config: Record<string, string> = {};
    settingsRaw.forEach(s => {
      config[s.key] = s.value;
    });

    const dbApiKey = config['BREVO_API_KEY'];
    const brevoApiKey = (dbApiKey && dbApiKey !== 'xkeysib-placeholder') ? dbApiKey : process.env.BREVO_API_KEY;
    const provider = config['EMAIL_PROVIDER'] || process.env.EMAIL_PROVIDER || (brevoApiKey ? 'BREVO' : 'SMTP');
    const fromAddress = config['SMTP_FROM'] || process.env.SMTP_FROM || '"Lumina Bank" <noreply@luminabank.com>';

    console.log(`Preparing to send email to ${to} via ${provider}`);

    if (provider === 'BREVO' && brevoApiKey) {
      // Send using Brevo HTTP API
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { email: fromAddress.replace(/^".*"\s+</, '').replace(/>$/, ''), name: 'Lumina Bank' },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Brevo API Error:', errorData);
      } else {
        console.log(`\n\n=== BREVO API EMAIL SENT TO ${to} ===`);
        console.log(`Subject: ${subject}`);
        console.log(`===================================\n\n`);
      }
      return;
    }

    // SMTP logic (either configured via Admin Panel or fallback to environment or fallback to ethereal test)
    let transporter: nodemailer.Transporter | null = null;

    if (config['SMTP_HOST'] && config['SMTP_USER'] && config['SMTP_PASS']) {
      transporter = nodemailer.createTransport({
        host: config['SMTP_HOST'],
        port: parseInt(config['SMTP_PORT'] || '587'),
        secure: config['SMTP_PORT'] === '465' || config['SMTP_SECURE'] === 'true',
        auth: {
          user: config['SMTP_USER'],
          pass: config['SMTP_PASS']
        }
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }

    if (!transporter) {
      // Fallback to test/log
      console.log(`\n\n=== NO SMTP/BREVO CONFIGURED: FALLBACK TO CONSOLE ===`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content (HTML omitted for brevity)`);
      console.log(`===================================\n\n`);
      return;
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html
    });

    console.log(`\n\n=== SMTP EMAIL SENT TO ${to} ===`);
    console.log(`Subject: ${subject}`);
    console.log(`Message ID: ${info.messageId}`);
    if (!process.env.SMTP_HOST && !config['SMTP_HOST']) {
      try {
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      } catch (e) {}
    }
    console.log(`===================================\n\n`);

  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const emailLayout = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #050505;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin: 0; padding: 40px 0; background-color: #050505; color: #e5e7eb;">
  <div style="max-width: 550px; margin: 0 auto; background-color: #0d0d0d; border: 1px solid #1f1f1f; border-radius: 16px; padding: 40px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.65);">
    <!-- Logo/Header -->
    <div style="text-align: center; margin-bottom: 35px; border-bottom: 1px solid #1f1f1f; padding-bottom: 25px;">
      <span style="font-size: 22px; font-weight: 800; letter-spacing: 3px; color: #ffffff; text-transform: uppercase;">
        LUMINA<span style="color: #60a5fa;">.</span>BANK
      </span>
    </div>
    
    <!-- Title -->
    <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 20px; text-align: left;">
      ${title}
    </h2>
    
    <!-- Body Content -->
    <div style="font-size: 15px; line-height: 1.6; color: #d1d5db;">
      ${bodyContent}
    </div>
    
    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #1f1f1f; text-align: center; font-size: 12px; color: #6b7280; line-height: 1.5;">
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Lumina Bank. All rights reserved.</p>
      <p style="margin: 5px 0 0 0;">This is an automated security notification. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;

// Beautiful, premium email templates matching Lumina Bank dark theme branding
export const templates = {
  registrationWelcome: (name: string) => emailLayout(
    'Welcome to Lumina Bank',
    `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for creating your account with Lumina Bank. We are thrilled to have you join our digital banking platform.</p>
      <p>To fully activate your account features and secure your official bank account details, the next step is to submit your identity documents for compliance review.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="http://localhost:3000/dashboard/kyc" style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 700; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 14px; transition: background-color 0.2s;">
          Verify Identity (KYC)
        </a>
      </div>
      <p style="font-size: 13px; color: #9ca3af; margin-top: 25px;">If you have any questions or require assistance setting up, please contact our support team.</p>
    `
  ),

  kycSubmitted: (name: string, accountNumber: string) => emailLayout(
    'Documents Received & Account Prepared',
    `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for completing your KYC verification. Our compliance team is currently reviewing your uploaded identity documents.</p>
      <p>This process typically completes within 5-15 minutes. Once approved, you will have full access to transfer and withdraw funds.</p>
      
      <div style="background-color: #141414; border: 1px solid #262626; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
        <span style="display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Your Official Account Number</span>
        <span style="font-size: 26px; color: #ffffff; font-weight: 700; font-family: monospace; letter-spacing: 3px;">${accountNumber}</span>
      </div>
      
      <p style="font-size: 13px; color: #9ca3af; margin-top: 25px;">We will notify you immediately via email and dashboard notifications once the review is finalized.</p>
    `
  ),

  welcome: (name: string, accountNumber: string) => templates.kycSubmitted(name, accountNumber),

  transferSent: (amount: number, recipient: string) => emailLayout(
    'Transfer Processed',
    `
      <p>Hello,</p>
      <p>Your transfer request has been successfully processed and sent.</p>
      
      <div style="background-color: #141414; border: 1px solid #262626; border-radius: 12px; padding: 20px; margin: 30px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="color: #6b7280; padding: 6px 0;">Recipient</td>
            <td style="color: #ffffff; text-align: right; font-weight: 600; padding: 6px 0;">${recipient}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 6px 0;">Amount</td>
            <td style="color: #ffffff; text-align: right; font-weight: 600; padding: 6px 0;">$${amount.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    `
  ),

  transferReceived: (amount: number, sender: string) => emailLayout(
    'Funds Received',
    `
      <p>Hello,</p>
      <p>You have successfully received a transfer into your account.</p>
      
      <div style="background-color: #141414; border: 1px solid #262626; border-radius: 12px; padding: 20px; margin: 30px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="color: #6b7280; padding: 6px 0;">Sender</td>
            <td style="color: #ffffff; text-align: right; font-weight: 600; padding: 6px 0;">${sender}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 6px 0;">Amount Received</td>
            <td style="color: #34d399; text-align: right; font-weight: 700; padding: 6px 0;">+$${amount.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    `
  ),

  transactionStatus: (type: string, amount: number, status: string, reason?: string) => {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);

    let statusColor = '#ffffff';
    if (status === 'APPROVED' || status === 'COMPLETED') statusColor = '#34d399';
    if (status === 'DECLINED' || status === 'FAILED') statusColor = '#f87171';
    if (status === 'PENDING') statusColor = '#fbbf24';

    let extraDetails = '';
    if (reason && status === 'DECLINED') {
      extraDetails = `
        <div style="margin-top: 15px; padding: 12px; background-color: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.2); border-radius: 8px; color: #f87171; font-size: 13px;">
          <strong>Decline Reason:</strong> ${reason}
        </div>
      `;
    }

    return emailLayout(
      `Transaction ${status.charAt(0) + status.slice(1).toLowerCase()}`,
      `
        <p>Hello,</p>
        <p>Your transaction has been processed with the following details:</p>
        
        <div style="background-color: #141414; border: 1px solid #262626; border-radius: 12px; padding: 20px; margin: 30px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Transaction Type</td>
              <td style="color: #ffffff; text-align: right; font-weight: 600; padding: 6px 0;">${type}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Amount</td>
              <td style="color: #ffffff; text-align: right; font-weight: 600; padding: 6px 0;">${formattedAmount}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Status</td>
              <td style="color: ${statusColor}; text-align: right; font-weight: 700; padding: 6px 0;">${status}</td>
            </tr>
          </table>
          ${extraDetails}
        </div>
      `
    );
  }
};
