import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { vac_rol_enum } from "@/app/generated/prisma/client";
import { listActiveUsersByRole } from "../repositories/userRoleRepository";
import { getExpectedRoleForStep } from "../types/userRole";

type Recipient = {
  nombre: string;
  email: string | null;
};

type VacationRequestForEmail = {
  id: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  dias_habiles: number;
  observacion: string | null;
  usuario: Recipient & {
    username: string;
  };
};

type MailPayload = {
  to: Recipient[];
  subject: string;
  heading: string;
  intro: string;
  solicitud: VacationRequestForEmail;
  actionText?: string;
  comentario?: string;
};

const ROLE_LABELS: Record<vac_rol_enum, string> = {
  Profesor: "Profesor",
  Jefe_de_Departamento: "Jefe de Departamento",
  Jefe_Administrativo: "Jefatura Administrativa",
  Director_de_Escuela: "Director de Escuela",
};

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
let warnedMissingConfig = false;

function notificationsDisabled() {
  return process.env.EMAIL_NOTIFICATIONS_ENABLED === "false";
}

function getBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_VACATION_APP_URL ||
    `http://localhost:${process.env.PORT || "3002"}`
  ).replace(/\/$/, "");
}

function getFromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "";
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && getFromAddress());
}

function getTransporter() {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "true" ||
    (!process.env.SMTP_SECURE && port === 465);

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  return transporter;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function requestUrl(solicitud: VacationRequestForEmail) {
  return `${getBaseUrl()}/vacation/requests/${solicitud.id}`;
}

function uniqueEmails(recipients: Recipient[]) {
  const seen = new Set<string>();
  return recipients
    .map((recipient) => recipient.email?.trim())
    .filter((email): email is string => Boolean(email))
    .filter((email) => {
      const normalized = email.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function buildText(payload: MailPayload) {
  const lines = [
    payload.heading,
    "",
    payload.intro,
    "",
    `Solicitante: ${payload.solicitud.usuario.nombre}`,
    `Periodo: ${formatDate(payload.solicitud.fecha_inicio)} al ${formatDate(payload.solicitud.fecha_fin)}`,
    `Dias habiles: ${payload.solicitud.dias_habiles}`,
  ];

  if (payload.solicitud.observacion) {
    lines.push(`Observacion: ${payload.solicitud.observacion}`);
  }

  if (payload.comentario) {
    lines.push("", `Comentario: ${payload.comentario}`);
  }

  lines.push("", payload.actionText || "Puede revisar el detalle en:", requestUrl(payload.solicitud));

  return lines.join("\n");
}

function buildHtml(payload: MailPayload) {
  const observacion = payload.solicitud.observacion
    ? `<p><strong>Observacion:</strong> ${escapeHtml(payload.solicitud.observacion)}</p>`
    : "";
  const comentario = payload.comentario
    ? `<p><strong>Comentario:</strong> ${escapeHtml(payload.comentario)}</p>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 16px;">${escapeHtml(payload.heading)}</h2>
      <p>${escapeHtml(payload.intro)}</p>
      <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p><strong>Solicitante:</strong> ${escapeHtml(payload.solicitud.usuario.nombre)}</p>
        <p><strong>Periodo:</strong> ${escapeHtml(formatDate(payload.solicitud.fecha_inicio))} al ${escapeHtml(formatDate(payload.solicitud.fecha_fin))}</p>
        <p><strong>Dias habiles:</strong> ${payload.solicitud.dias_habiles}</p>
        ${observacion}
        ${comentario}
      </div>
      <p>${escapeHtml(payload.actionText || "Puede revisar el detalle en el sistema.")}</p>
      <p>
        <a href="${escapeHtml(requestUrl(payload.solicitud))}" style="color: #0f766e;">
          Ver solicitud #${payload.solicitud.id}
        </a>
      </p>
    </div>
  `;
}

async function sendMail(payload: MailPayload) {
  if (notificationsDisabled()) return;

  if (!isSmtpConfigured()) {
    if (!warnedMissingConfig) {
      console.warn("Email notifications skipped: SMTP_HOST and SMTP_FROM/SMTP_USER are not configured.");
      warnedMissingConfig = true;
    }
    return;
  }

  const to = uniqueEmails(payload.to);
  if (to.length === 0) return;

  try {
    await getTransporter().sendMail({
      from: getFromAddress(),
      to,
      subject: payload.subject,
      text: buildText(payload),
      html: buildHtml(payload),
    });
  } catch (error) {
    console.error("Could not send vacation email notification", error);
  }
}

export async function notifyPendingReview(
  solicitud: VacationRequestForEmail,
  pasoActual: number | null
) {
  const role = getExpectedRoleForStep(pasoActual);
  if (!role) return;

  const reviewers = await listActiveUsersByRole(role);

  await sendMail({
    to: reviewers,
    subject: `Solicitud de vacaciones #${solicitud.id} pendiente de revision`,
    heading: "Solicitud de vacaciones pendiente de revision",
    intro: `Hay una solicitud que requiere revision de ${ROLE_LABELS[role]}.`,
    solicitud,
    actionText: "Ingrese al sistema para revisar y registrar su decision.",
  });
}

export async function notifyApplicantApproved(solicitud: VacationRequestForEmail) {
  await sendMail({
    to: [solicitud.usuario],
    subject: `Solicitud de vacaciones #${solicitud.id} aprobada`,
    heading: "Solicitud de vacaciones aprobada",
    intro: "Su solicitud de vacaciones fue aprobada.",
    solicitud,
    actionText: "Puede consultar el historial y detalle de la solicitud en el sistema.",
  });
}

export async function notifyApplicantRejected(
  solicitud: VacationRequestForEmail,
  comentario: string
) {
  await sendMail({
    to: [solicitud.usuario],
    subject: `Solicitud de vacaciones #${solicitud.id} rechazada`,
    heading: "Solicitud de vacaciones rechazada",
    intro: "Su solicitud de vacaciones fue rechazada.",
    solicitud,
    comentario,
    actionText: "Puede consultar el detalle de la decision en el sistema.",
  });
}
