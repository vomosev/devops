import './globals.css';
import { AuthProvider } from '../lib/AuthContext';
import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';

export const metadata = {
  metadataBase: new URL('https://devops.arx-app.com'),
  title: 'DevOps Academy — Training & Development',
  description:
    'Hands-on DevOps training for engineers: CI/CD pipelines, Kubernetes, Terraform, observability and SRE practice with labs, quizzes and skill tracking.',
  applicationName: 'DevOps Academy',
  openGraph: {
    title: 'DevOps Academy — Training & Development',
    description:
      'Hands-on DevOps training for engineers: CI/CD pipelines, Kubernetes, Terraform, observability and SRE practice.',
    url: 'https://devops.arx-app.com',
    siteName: 'DevOps Academy',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1220',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="page-shell">
            <SiteHeader />
            <main className="site-main">
              <div className="container">{children}</div>
            </main>
            <SiteFooter />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}