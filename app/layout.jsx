import "../public/style.css";
export const metadata = {
  title: "Wordkind · Word play",
  description: "Connect the letters. Find the words. Challenge a friend.",
  icons: { icon: "/assets/icon.svg" },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f4ec",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
