export default function Home() {
  return (
    <main className="flex min-h-screen flex-col justify-center px-8 py-12">
      <h1 className="text-3xl font-semibold">EMATE Vacation System</h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        Standalone vacation request module prepared for SAC iframe embedding.
      </p>
      <a className="mt-6 w-fit text-sm font-medium underline" href="/vacation">
        Open vacation module
      </a>
    </main>
  );
}
