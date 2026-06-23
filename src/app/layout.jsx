import './globals.css'

export const metadata = {
  title: 'Smart Routine',
  description: 'Your intelligent daily routine tracker',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
