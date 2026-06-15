export interface CreateRequestInput {
  fecha_inicio: string;
  fecha_fin: string;
  observacion?: string;
}

export interface ValidatedCreateRequestInput {
  fecha_inicio: Date;
  fecha_fin: Date;
  observacion?: string;
}

export class CreateRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateRequestValidationError";
  }
}

function parseDateField(value: unknown, fieldName: string): Date {
  if (typeof value !== "string" || !value.trim()) {
    throw new CreateRequestValidationError(`${fieldName} es requerida`);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new CreateRequestValidationError(`${fieldName} debe tener formato YYYY-MM-DD`);
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  date.setHours(0, 0, 0, 0);

  const isValidDate =
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day);

  if (!isValidDate) {
    throw new CreateRequestValidationError(`${fieldName} no es una fecha válida`);
  }

  return date;
}

export function validateCreateRequestInput(input: unknown): ValidatedCreateRequestInput {
  if (!input || typeof input !== "object") {
    throw new CreateRequestValidationError("Datos de solicitud inválidos");
  }

  const data = input as Record<string, unknown>;
  const fecha_inicio = parseDateField(data.fecha_inicio, "fecha_inicio");
  const fecha_fin = parseDateField(data.fecha_fin, "fecha_fin");

  if (fecha_fin < fecha_inicio) {
    throw new CreateRequestValidationError("La fecha de fin debe ser igual o posterior a la fecha de inicio");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (fecha_inicio < today) {
    throw new CreateRequestValidationError("La fecha de inicio no puede ser anterior a la fecha actual");
  }

  let observacion: string | undefined;
  if (data.observacion !== undefined && data.observacion !== null) {
    if (typeof data.observacion !== "string") {
      throw new CreateRequestValidationError("La observación debe ser texto");
    }

    observacion = data.observacion.trim() || undefined;
    if (observacion && observacion.length > 300) {
      throw new CreateRequestValidationError("La observación no puede superar 300 caracteres");
    }
  }

  return { fecha_inicio, fecha_fin, observacion };
}
