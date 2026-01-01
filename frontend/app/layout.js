import './globals.css';

export const metadata = {
  title: 'SkyWings - Your Travel Partner',
  description: 'Book flights, hotels, and more with SkyWings',
  keywords: 'flights, travel, booking, hotels, vacation',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
