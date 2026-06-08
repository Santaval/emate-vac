type VacationRequestRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: VacationRequestRouteContext) {
  const { id } = await params;

  return Response.json(
    { id, message: "Vacation request detail endpoint pending implementation." },
    { status: 501 },
  );
}

export async function PATCH(_request: Request, { params }: VacationRequestRouteContext) {
  const { id } = await params;

  return Response.json(
    { id, message: "Vacation request update endpoint pending implementation." },
    { status: 501 },
  );
}
