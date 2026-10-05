import Link from "next/link";
import { GROUP_NAME } from "@/lib/site";

export const metadata = {
  title: "Get the app",
  description: "Add Going Going Gone to your phone's home screen. It opens like an app, with no app store and nothing to pay.",
};

export default function GetTheApp() {
  return (
    <div className="wrap prose">
      <h1 className="page-title">Get the app</h1>
      <p className="page-lead">Put Going Going Gone on your phone&apos;s home screen, next to your other apps. It opens full screen, straight to the auctions. There&apos;s no app store, nothing to pay, and it takes about 10 seconds.</p>

      <div className="app-steps">
        <section className="app-step">
          <h2>iPhone or iPad</h2>
          <ol>
            <li>Open <strong>going-going-gone.uk</strong> in <strong>Safari</strong> (the blue compass). If you came from Facebook, tap <strong>⋯</strong> and choose <strong>Open in browser</strong> first.</li>
            <li>Tap the <strong>Share</strong> button: the square with an arrow pointing up, at the bottom of the screen.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          </ol>
        </section>
        <section className="app-step">
          <h2>Android (including Samsung)</h2>
          <ol>
            <li>Open the <strong>Chrome</strong> app (the red, yellow and green circle) and go to <strong>going-going-gone.uk</strong>. On Samsung phones, use Chrome rather than Samsung Internet: see the note below.</li>
            <li>Tap the <strong>⋮</strong> menu at the top right.</li>
            <li>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>), then <strong>Install</strong>.</li>
          </ol>
        </section>
      </div>

      <h2>Samsung phones: &ldquo;Unsafe app&rdquo; warning</h2>
      <p>If you add the site using Samsung&apos;s own browser (<strong>Samsung Internet</strong>), some Samsung phones show an &ldquo;Unsafe app&rdquo; warning. That&apos;s because Samsung Internet installs it outside the Play Store, so the phone can&apos;t check it the usual way. It isn&apos;t a problem with Going Going Gone, but you don&apos;t need to see it: add the site from <strong>Chrome</strong> instead and it installs without any warning. If you already added it from Samsung Internet, press and hold the icon, remove it, then add it again from Chrome.</p>

      <h2>Signing in on the app</h2>
      <p>We email you a sign-in link and a 6-digit code. On the app, <strong>type the code</strong> rather than tapping the link, because links in emails open in your web browser instead of the app. You only need to do this once.</p>

      <h2>Notifications</h2>
      <p>Once the app is on your home screen, open it, go to <strong>My account</strong> and tap <strong>Turn on notifications</strong>. Your phone will buzz the moment you&apos;re outbid, win, or someone replies to you.</p>

      <h2>Is it safe?</h2>
      <p>Yes. It&apos;s the same website you already use, just with its own icon. It doesn&apos;t get access to your photos, contacts or location, and you can remove it any time by pressing and holding the icon.</p>

      <p><Link href="/" className="btn btn-brass">Back to the auctions</Link></p>
      <p className="hint">Tell the {GROUP_NAME} group about it. Most people browse on their phones.</p>
    </div>
  );
}
