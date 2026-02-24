"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import styles from "./Landing.module.css";

const DISCORD_INVITE_URL = "https://discord.gg/6ssfZnFaMg";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export default function LandingPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  const submitWaitlist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!isConfigured) {
      setSubmitError("Waitlist is not configured yet.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      name: name.trim() || null,
      email: email.trim().toLowerCase(),
      source: "waitlist-landing",
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist_signups?on_conflict=email`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setSubmitError("Could not join the waitlist right now. Try again.");
        setIsSubmitting(false);
        return;
      }

      setSubmitted(true);
      setIsSubmitting(false);
      setName("");
      setEmail("");
    } catch {
      setSubmitError("Network error while joining waitlist. Try again.");
      setIsSubmitting(false);
    }
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
        <p>Drop your email to get launch updates.</p>
        {!submitted ? (
          <form className={styles.form} onSubmit={submitWaitlist}>
            <input
              type="text"
              placeholder="Name (optional)"
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
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </button>
          </form>
        ) : (
          <div className={styles.success}>
            <p>You&apos;re in. Join Discord for updates.</p>
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className={styles.linkButton}>
              Join Discord
            </a>
          </div>
        )}
        {submitError && <p className={styles.warningNote}>{submitError}</p>}
        {!isConfigured && (
          <p className={styles.warningNote}>
            Admin note: set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> in deployment env vars.
          </p>
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
