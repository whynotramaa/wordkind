import Script from "next/script";
import { catalogUrl } from "../lib/puzzle-catalog.js";
import GameScreen from "./game-screen";
export default function Home() {
  return (
    <>
      <link rel="preload" href={catalogUrl} as="fetch" crossOrigin="anonymous" />
      <GameScreen />
      <Script
        src="/app.js"
        type="module"
        strategy="afterInteractive"
        data-catalog={catalogUrl}
      />
    </>
  );
}
