export async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;
  } catch {
    return fallback;
  }

  return fallback;
}

export function getDefaultApiErrorMessage(status: number) {
  if (status === 401) return "Sesión vencida o no autenticada. Inicie sesión de nuevo desde SAC.";
  if (status === 403) return "No tiene permisos para realizar esta acción.";
  if (status === 404) return "No se encontró la información solicitada.";
  if (status >= 500) return "Ocurrió un error del servidor. Intente nuevamente más tarde.";
  return "No se pudo completar la solicitud.";
}
