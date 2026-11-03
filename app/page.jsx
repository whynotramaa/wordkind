import Script from "next/script";
import GameScreen from "./game-screen";
export default function Home() {
  return (
    <>
      <GameScreen />
      <Script src="/app.js" type="module" strategy="afterInteractive" />
    </>
  );
}
