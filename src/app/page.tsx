"use client";

import Image from "next/image";
import styles from "./Landing.module.css";

const DISCORD_INVITE_URL = "https://discord.gg/6ssfZnFaMg";
const WAITLIST_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfAQKuUPGeo7KkiqVzclZRytFucQcb10HDDjXFLJvSYtARM0Q/viewform?usp=publish-editor";

export default function LandingPage() {
  const openWaitlistAndDiscord = () => {
    window.open(WAITLIST_FORM_URL, "_blank", "noopener,noreferrer");
    window.open(DISCORD_INVITE_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <main className={styles.page}>
      <div className={styles.orbA} aria-hidden />
      <div className={styles.orbB} aria-hidden />
      <div className={styles.gridNoise} aria-hidden />

      <header className={`${styles.header} ${styles.reveal}`}>
        <div>
          <h1 className={styles.title}>Sue The SousChef</h1>
          <p className={styles.hook}>Cook like you know what you are doing.</p>
          <div className={styles.heroMeta}>
            <span>VOICE-FIRST ASSISTANT</span>
            <span>MULTI-SESSION FLOW</span>
            <span>TIMER NATIVE</span>
          </div>
        </div>
      </header>

      <section className={`${styles.shotGrid} ${styles.reveal}`}>
        <article className={styles.shotCard}>
          <h2>Inside Sue</h2>
          <div className={styles.shotMedia}>
            <Image
              src="/sue-real-screenshot-1.png"
              alt="Real screenshot of Sue The SousChef timer view"
              width={1200}
              height={760}
              quality={100}
              unoptimized
              className={styles.shotImage}
              priority
            />
          </div>
        </article>
      </section>

      <section className={`${styles.intro} ${styles.reveal}`}>
        <h2>Built for real kitchens, not demos.</h2>
        <p>
          Sue The SousChef gives you a focused cooking workspace: import recipes from anywhere, keep multiple dishes
          moving at once, and get timer support exactly when each step needs it. The assistant tracks context in real
          time so you can stay in flow even during larger meals.
        </p>
        <p>
          It is designed around practical execution: clear step guidance, flexible handling for allergies and dietary
          constraints, and reliable coordination across sessions and timers without forcing rigid commands.
        </p>
      </section>

      <section className={`${styles.features} ${styles.reveal}`}>
        <h2>Core Features</h2>
        <div className={styles.featureGrid}>
          <FeatureCard
            title="Assistant Guidance"
            text="Sue walks with you through prep, cooking, substitutions, and timing decisions."
            tier="hero"
          />
          <FeatureCard
            title="Recipe Import"
            text="Paste recipe links and immediately bring full step-by-step instructions into Sue."
            tier="major"
          />
          <FeatureCard
            title="Multi-Session Cooking"
            text="Track multiple dishes at once for larger meals without losing your place."
            tier="major"
          />
          <FeatureCard
            title="Automatic Timer Setup"
            text="Assistant-triggered timer starts and smart suggestions keep every step on schedule."
            tier="majorWide"
          />
          <FeatureCard
            title="Allergy and Dietary Accommodations"
            text="Guidance can adapt around restrictions and ingredient conflicts while you cook."
            tier="support"
          />
        </div>
      </section>

      <section className={`${styles.roadmap} ${styles.reveal}`}>
        <h2>What&apos;s Next</h2>
        <p>
          We plan to add live photo feedback for in-the-moment cooking correction and take Sue The SousChef into
          dedicated mobile development.
        </p>
      </section>

      <section className={`${styles.waitlist} ${styles.reveal}`}>
        <h2>Join the Waitlist</h2>
        <p>One click joins the waitlist and opens Discord immediately after.</p>
        <div className={styles.form}>
          <button type="button" className={styles.button} onClick={openWaitlistAndDiscord}>
            Join Waitlist + Discord
          </button>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  text,
  tier = "support",
}: {
  title: string;
  text: string;
  tier?: "hero" | "major" | "majorWide" | "support";
}) {
  const tierClass = (() => {
    if (tier === "hero") return styles.featureHero;
    if (tier === "major") return styles.featureMajor;
    if (tier === "majorWide") return styles.featureMajorWide;
    return styles.featureSupport;
  })();
  return (
    <article className={`${styles.featureCard} ${tierClass}`}>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
