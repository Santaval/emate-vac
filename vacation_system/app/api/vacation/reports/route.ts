import { unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import {
  obtenerReporteVacaciones,
  reporteVacacionesCsv,
  reporteVacacionesPdf,
  ReportError,
} from "@/modules/vacation/services/reportService";

export async function GET(request: Request) {
  try {
    const { roles } = await authenticate(request);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const report = await obtenerReporteVacaciones(roles, {
      fecha_inicio: searchParams.get("fecha_inicio"),
      fecha_fin: searchParams.get("fecha_fin"),
    });

    if (format === "csv") {
      return new Response(reporteVacacionesCsv(report), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="reporte-vacaciones.csv"',
        },
      });
    }

    if (format === "pdf") {
      const pdf = reporteVacacionesPdf(report);
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="reporte-vacaciones.pdf"',
        },
      });
    }

    return Response.json(report);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    if (e instanceof ReportError) {
      if (e.statusCode === 403) return forbiddenResponse(e.message);
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
