export default function VacationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <section className="min-h-screen">{children}</section>;
}
