import type { vac_estado_enum, vac_rol_enum } from "@/app/generated/prisma/client";
import { listReportRequests, listReportUsers } from "../repositories/reportRepository";
import { hasRole } from "../types/userRole";

export class ReportError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = "ReportError";
  }
}

function requireReportAccess(roles: vac_rol_enum[]) {
  if (!hasRole(roles, "Jefe_Administrativo") && !hasRole(roles, "Director_de_Escuela")) {
    throw new ReportError("No tiene permisos para consultar reportes", 403);
  }
}

function parseDate(value: string | null) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ReportError("Las fechas deben tener formato YYYY-MM-DD");
  }
  return new Date(`${value}T00:00:00`);
}

function monthKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function emptyStatusCounts(): Record<vac_estado_enum, number> {
  return { Borrador: 0, Enviado: 0, Aprobado: 0, Rechazado: 0 };
}

export async function obtenerReporteVacaciones(
  roles: vac_rol_enum[],
  filters: { fecha_inicio?: string | null; fecha_fin?: string | null } = {}
) {
  requireReportAccess(roles);

  const fecha_inicio = parseDate(filters.fecha_inicio ?? null);
  const fecha_fin = parseDate(filters.fecha_fin ?? null);
  const [users, requests] = await Promise.all([
    listReportUsers(),
    listReportRequests({ fecha_inicio, fecha_fin }),
  ]);

  const statusCounts = emptyStatusCounts();
  const byMonth = new Map<string, Record<vac_estado_enum, number>>();

  for (const request of requests) {
    statusCounts[request.estado] += 1;
    const key = monthKey(request.fecha_inicio);
    const current = byMonth.get(key) ?? emptyStatusCounts();
    current[request.estado] += 1;
    byMonth.set(key, current);
  }

  const byUser = users.map((user) => {
    const userRequests = requests.filter((request) => request.id_usuario === user.id);
    const userStatusCounts = emptyStatusCounts();
    let approvedDays = 0;

    for (const request of userRequests) {
      userStatusCounts[request.estado] += 1;
      if (request.estado === "Aprobado") approvedDays += request.dias_habiles;
    }

    return {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      email: user.email,
      dias_disponibles: user.dias_vacaciones_disponibles,
      dias_tomados: approvedDays,
      solicitudes: userStatusCounts,
      total_solicitudes: userRequests.length,
      periodos_autorizados: user.vac_periodo_autorizado.length,
      dias_autorizados_disponibles: user.vac_periodo_autorizado
        .filter((period) => period.estado === "Disponible")
        .reduce((total, period) => total + period.dias_autorizados, 0),
    };
  });

  return {
    resumen: {
      total_profesores: users.length,
      profesores_sin_solicitudes: byUser.filter((user) => user.total_solicitudes === 0).length,
      dias_disponibles: byUser.reduce((total, user) => total + user.dias_disponibles, 0),
      dias_tomados: byUser.reduce((total, user) => total + user.dias_tomados, 0),
      solicitudes: statusCounts,
    },
    por_docente: byUser,
    por_mes: Array.from(byMonth.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mes, solicitudes]) => ({ mes, solicitudes })),
    solicitudes: requests.map((request) => ({
      id: request.id,
      profesor: request.usuario.nombre,
      email: request.usuario.email,
      estado: request.estado,
      fecha_inicio: request.fecha_inicio,
      fecha_fin: request.fecha_fin,
      dias_habiles: request.dias_habiles,
      fecha_modificacion: request.fecha_modificacion,
    })),
    profesores_sin_solicitudes: byUser.filter((user) => user.total_solicitudes === 0),
  };
}

function csvEscape(value: unknown) {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function reporteVacacionesCsv(report: Awaited<ReturnType<typeof obtenerReporteVacaciones>>) {
  const rows = [
    [
      "Profesor",
      "Correo",
      "Días disponibles",
      "Días tomados",
      "Borrador",
      "Enviado",
      "Aprobado",
      "Rechazado",
      "Total solicitudes",
      "Periodos autorizados",
      "Días autorizados disponibles",
    ],
    ...report.por_docente.map((user) => [
      user.nombre,
      user.email ?? "",
      user.dias_disponibles,
      user.dias_tomados,
      user.solicitudes.Borrador,
      user.solicitudes.Enviado,
      user.solicitudes.Aprobado,
      user.solicitudes.Rechazado,
      user.total_solicitudes,
      user.periodos_autorizados,
      user.dias_autorizados_disponibles,
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function pdfText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildReportLines(report: Awaited<ReturnType<typeof obtenerReporteVacaciones>>) {
  const lines = [
    "Reporte de vacaciones",
    "",
    `Profesores: ${report.resumen.total_profesores}`,
    `Profesores sin solicitudes: ${report.resumen.profesores_sin_solicitudes}`,
    `Dias disponibles: ${report.resumen.dias_disponibles}`,
    `Dias tomados: ${report.resumen.dias_tomados}`,
    `Solicitudes - Borrador: ${report.resumen.solicitudes.Borrador}, Enviado: ${report.resumen.solicitudes.Enviado}, Aprobado: ${report.resumen.solicitudes.Aprobado}, Rechazado: ${report.resumen.solicitudes.Rechazado}`,
    "",
    "Resumen por docente",
    "Docente | Disponibles | Tomados | Aprobadas | Rechazadas | Periodos",
    ...report.por_docente.map((user) =>
      `${user.nombre} | ${user.dias_disponibles} | ${user.dias_tomados} | ${user.solicitudes.Aprobado} | ${user.solicitudes.Rechazado} | ${user.periodos_autorizados}`
    ),
    "",
    "Solicitudes por mes",
    "Mes | Enviado | Aprobado | Rechazado",
    ...report.por_mes.map((month) =>
      `${month.mes} | ${month.solicitudes.Enviado} | ${month.solicitudes.Aprobado} | ${month.solicitudes.Rechazado}`
    ),
    "",
    "Solicitudes",
    "ID | Profesor | Estado | Inicio | Fin | Dias",
    ...report.solicitudes.map((request) =>
      `${request.id} | ${request.profesor} | ${request.estado} | ${pdfDate(request.fecha_inicio)} | ${pdfDate(request.fecha_fin)} | ${request.dias_habiles}`
    ),
  ];

  return lines.flatMap((line) => {
    if (line.length <= 105) return [line];
    const chunks = [];
    for (let i = 0; i < line.length; i += 105) chunks.push(line.slice(i, i + 105));
    return chunks;
  });
}

export function reporteVacacionesPdf(report: Awaited<ReturnType<typeof obtenerReporteVacaciones>>) {
  const lines = buildReportLines(report);
  const linesPerPage = 48;
  const pages: string[][] = [];

  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }

  const objects: string[] = [];
  const addObject = (value: string) => {
    objects.push(value);
    return objects.length;
  };

  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  const fontObjectId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  for (const pageLines of pages) {
    const content = [
      "BT",
      "/F1 10 Tf",
      "14 TL",
      "40 752 Td",
      ...pageLines.map((line) => `(${pdfText(line)}) Tj T*`),
      "ET",
    ].join("\n");
    const contentObjectId = addObject(`<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`);
    contentObjectIds.push(contentObjectId);
    pageObjectIds.push(0);
  }

  const pagesObjectId = objects.length + pages.length + 1;
  const catalogObjectId = pagesObjectId + 1;

  for (let i = 0; i < pages.length; i += 1) {
    const pageObjectId = addObject(
      `<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectIds[i]} 0 R >>`
    );
    pageObjectIds[i] = pageObjectId;
  }

  addObject(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`);
  addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObjectId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "ascii");
}
