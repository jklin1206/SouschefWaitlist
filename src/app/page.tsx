"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import styles from "./Landing.module.css";

const DISCORD_INVITE_URL = "https://discord.gg/6ssfZnFaMg";
const WAITLIST_WEBHOOK_URL = process.env.NEXT_PUBLIC_WAITLIST_WEBHOOK_URL;

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remoteStored, setRemoteStored] = useState<boolean | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString(),
      source: "waitlist-landing",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    };
    let delivered = false;

    if (WAITLIST_WEBHOOK_URL) {
      try {
        const response = await fetch(WAITLIST_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        delivered = response.ok;
      } catch {
        delivered = false;
      }
    }
    setRemoteStored(delivered);

    try {
      const existing = localStorage.getItem("sue_waitlist_entries");
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(payload);
      localStorage.setItem("sue_waitlist_entries", JSON.stringify(parsed));
    } catch {
      // Non-blocking: keep signup flow even if storage is unavailable.
    }

    setSubmitted(true);
    setIsSubmitting(false);
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
        <p>
          Sign up to get product updates. Discord invite opens automatically after submission.
        </p>

        {!submitted ? (
          <form className={styles.form} onSubmit={onSubmit}>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
            />
            <button type="submit" className={styles.button}>
              {isSubmitting ? "Submitting..." : "Join Waitlist + Discord"}
            </button>
          </form>
        ) : (
          <div className={styles.success}>
            <p>
              {remoteStored
                ? "You're on the waitlist. Discord invite should already be open in a new tab."
                : "Submitted. Discord invite should already be open. Waitlist was saved locally; webhook delivery failed or is not configured yet."}
            </p>
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className={styles.linkButton}>
              Open Discord Again
            </a>
            {!WAITLIST_WEBHOOK_URL && (
              <p className={styles.warningNote}>
                Admin note: set <code>NEXT_PUBLIC_WAITLIST_WEBHOOK_URL</code> in your deploy environment to save users
                to Google Sheets.
              </p>
            )}
          </div>
        )}
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
