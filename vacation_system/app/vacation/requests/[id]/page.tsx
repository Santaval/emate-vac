type RequestDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RequestDetailPage({
  params,
}: RequestDetailPageProps) {
  const { id } = await params;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Request Detail</h1>
      <p className="mt-2 text-sm text-zinc-600">Request ID: {id}</p>
    </main>
  );
}
