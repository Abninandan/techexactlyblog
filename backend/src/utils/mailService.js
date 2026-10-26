const nodemailer = require("nodemailer");

let transporter;

const getTransporter = () => {
	const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
	const port = Number(process.env.SMTP_PORT || 587);

	if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !Number.isInteger(port)) {
		throw new Error("SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS must be configured");
	}

	if (!transporter) {
		transporter = nodemailer.createTransport({
			host: SMTP_HOST,
			port,
			secure: process.env.SMTP_SECURE === "true",
			auth: { user: SMTP_USER, pass: SMTP_PASS },
		});
	}

	return transporter;
};

const sendMail = async ({ to, subject, text, html, ...options }) => {
	if (!to || !subject || (!text && !html)) {
		throw new Error("Mail recipient, subject, and text or HTML content are required");
	}

	return getTransporter().sendMail({
		from: process.env.SMTP_FROM || process.env.SMTP_USER,
		to,
		subject,
		text,
		html,
		...options,
	});
};

module.exports = { sendMail };