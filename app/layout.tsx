import type { Metadata } from "next";
import Image from 'next/image';
import "./globals.css";

export const metadata: Metadata = {
  title: "PhysioTattva Consult",
  description: "Physiotherapy consultation and assessment platform by PhysioTattva.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="google-signin-client_id" content="580586315642-nasd4lpvavcl8s8bg725tcbcg1e9sjpv.apps.googleusercontent.com" />
        {/* <!-- Fathom - beautiful, simple website analytics --> */}
        <script src="https://cdn.usefathom.com/script.js" data-site="ONYOCTXK" defer></script>
        {/* <!-- / Fathom --> */}
      </head>
      <body className="bg-white text-gray-800">
        {/* Header with gradient border bottom */}
        <div className="border-b-4 border-blue-600 bg-white shadow-sm">
          <div className="flex mx-auto justify-between items-center px-4  max-w-[1206px]">
            <Image
              src="https://www.app.physiotattva247.com/assets/assets/images/logo.91ea6cf29a55da199eea5a233fca5f82.png"
              alt="PhysioTattva logo"
              width={100}
              height={20}
              priority={true}
            />
            <div className="flex gap-4">
              <a
                href="tel:+918025273377"
                className="hidden md:flex items-center text-blue-600 hover:text-blue-700"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                +91 8025273377
              </a>
              <a
                href="mailto:info@physiotattva247.com"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <main className="max-w-[1206px] mx-auto px-4 py-6">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 mt-8">
          <div className="max-w-[1206px] mx-auto px-4 py-6 text-sm text-gray-600">
            © 2025 PhysioTattva. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}