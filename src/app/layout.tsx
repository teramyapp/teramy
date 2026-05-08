import './globals.css';

export const metadata = {
  title: 'Teramy',
  description: 'Gestión y agendamiento simple para psicólogos y profesionales de la salud mental.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
