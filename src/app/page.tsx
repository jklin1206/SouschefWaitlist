"use client";

import Image from "next/image";
import styles from "./Landing.module.css";

const DISCORD_INVITE_URL = "https://discord.gg/6ssfZnFaMg";
const DEFAULT_WAITLIST_FORM_URL =
  "https://docs.google.com/forms/d/1Eh1IOAFq2_dW9FYG0uSPlkMZnDQMOy05HbhBevF8gU8/viewform";
const WAITLIST_FORM_URL = process.env.NEXT_PUBLIC_WAITLIST_GOOGLE_FORM_URL || DEFAULT_WAITLIST_FORM_URL;

export default function LandingPage() {
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
        <p>Waitlist and Discord are separate. Join the waitlist for launch emails; Discord is for community chat.</p>
        <div className={styles.waitlistActions}>
          <a
            href={WAITLIST_FORM_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.button}
            aria-disabled={!WAITLIST_FORM_URL}
          >
            Join Google Waitlist
          </a>
          <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className={styles.linkButton}>
            Join Discord
          </a>
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
