import '../index.css';

export const metadata = {
  title: 'RH Agroserv AI',
  description: 'Sistema de automação de folha de pagamento',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  )
}
