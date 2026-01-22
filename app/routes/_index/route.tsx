import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { useEffect, useState, useRef } from "react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

// Animated counter hook
function useCountUp(end: number, duration: number = 2000, delay: number = 0) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const timeoutId = setTimeout(() => {
      let startTime: number;
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(easeOut * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [hasStarted, end, duration, delay]);

  return { count, ref };
}

// Floating particles component
function FloatingParticles() {
  return (
    <div className={styles.particles}>
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className={styles.particle}
          style={{
            '--delay': `${Math.random() * 5}s`,
            '--duration': `${15 + Math.random() * 10}s`,
            '--x-start': `${Math.random() * 100}%`,
            '--x-end': `${Math.random() * 100}%`,
            '--size': `${4 + Math.random() * 8}px`,
            '--opacity': `${0.3 + Math.random() * 0.4}`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [shopValue, setShopValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const trees = useCountUp(1247832, 2500, 0);
  const stores = useCountUp(523, 2000, 200);
  const co2 = useCountUp(24968, 2200, 400);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className={`${styles.page} ${isLoaded ? styles.loaded : ''}`}>
      {/* Layered backgrounds for depth */}
      <div className={styles.bgLayer1} />
      <div className={styles.bgLayer2} />
      <div className={styles.bgLayer3} />
      <FloatingParticles />
      
      {/* Gradient overlays */}
      <div className={styles.gradientTop} />
      <div className={styles.gradientBottom} />

      {/* Main content */}
      <div className={styles.content}>
        {/* Logo with entrance animation */}
        <div className={styles.logoWrapper}>
          <div className={styles.logoGlow} />
          <div className={styles.logoContainer}>
            <img 
              src="/afforestation-logo.png" 
              alt="Afforestation" 
              className={styles.logoImage}
            />
          </div>
          <div className={styles.logoPulse} />
        </div>

        {/* Headline with staggered animation */}
        <div className={styles.headlineWrapper}>
          <h1 className={styles.headline}>
            <span className={styles.headlineWord}>Plant</span>
            <span className={styles.headlineWord}>trees</span>
            <span className={styles.headlineWord}>with</span>
          </h1>
          <p className={styles.headlineAccent}>every sale</p>
        </div>

        {/* Subtitle */}
        <p className={styles.subtitle}>
          Transform your Shopify store into a force for <span className={styles.highlight}>reforestation</span>.
          <br />
          Every order plants real trees—verified with GPS coordinates.
        </p>

        {/* Form with enhanced UX */}
        {showForm && (
          <div className={styles.formWrapper}>
            <Form className={styles.form} method="post" action="/auth/login">
              <div className={`${styles.inputContainer} ${isFocused ? styles.inputFocused : ''} ${shopValue ? styles.inputFilled : ''}`}>
                <div className={styles.inputIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <input
                  className={styles.input}
                  type="text"
                  name="shop"
                  value={shopValue}
                  onChange={(e) => setShopValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="your-store.myshopify.com"
                  autoComplete="off"
                />
                <button className={styles.submitButton} type="submit">
                  <span>Connect Store</span>
                  <svg className={styles.buttonArrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
            </Form>
            <p className={styles.formHint}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Free to install • No credit card required
            </p>
          </div>
        )}

        {/* Trust badges */}
        <div className={styles.trustBadges}>
          <div className={styles.badge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Verified by Shopify</span>
          </div>
          <div className={styles.badgeDivider} />
          <div className={styles.badge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>SSL Secured</span>
          </div>
          <div className={styles.badgeDivider} />
          <div className={styles.badge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>2min Setup</span>
          </div>
        </div>

        {/* Features grid */}
        <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <div className={styles.featureIconBg} />
              <svg className={styles.featureIcon} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <h3>Verified Impact</h3>
            <p>Every tree comes with GPS coordinates, species data, and growth tracking photos</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <div className={styles.featureIconBg} />
              <svg className={styles.featureIcon} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8"/>
                <path d="M12 17v4"/>
                <path d="M7 8h2"/>
                <path d="M7 11h4"/>
              </svg>
            </div>
            <h3>Storefront Widget</h3>
            <p>Beautiful impact counter that builds trust and drives conversions</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <div className={styles.featureIconBg} />
              <svg className={styles.featureIcon} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <path d="M3.27 6.96L12 12.01l8.73-5.05"/>
                <path d="M12 22.08V12"/>
              </svg>
            </div>
            <h3>ESG Reports</h3>
            <p>Enterprise-grade sustainability reporting for your business</p>
          </div>
        </div>

        {/* Live stats */}
        <div className={styles.statsSection}>
          <div className={styles.statsHeader}>
            <div className={styles.liveIndicator}>
              <span className={styles.liveDot} />
              Live Impact
            </div>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statCard} ref={trees.ref}>
              <div className={styles.statNumber}>
                {trees.count.toLocaleString()}
                <span className={styles.statPlus}>+</span>
              </div>
              <div className={styles.statLabel}>Trees Planted</div>
              <div className={styles.statBar}>
                <div className={styles.statBarFill} style={{ width: '85%' }} />
              </div>
            </div>
            <div className={styles.statCard} ref={stores.ref}>
              <div className={styles.statNumber}>
                {stores.count.toLocaleString()}
                <span className={styles.statPlus}>+</span>
              </div>
              <div className={styles.statLabel}>Stores Connected</div>
              <div className={styles.statBar}>
                <div className={styles.statBarFill} style={{ width: '65%' }} />
              </div>
            </div>
            <div className={styles.statCard} ref={co2.ref}>
              <div className={styles.statNumber}>
                {co2.count.toLocaleString()}
                <span className={styles.statUnit}>tons</span>
              </div>
              <div className={styles.statLabel}>CO₂ Offset</div>
              <div className={styles.statBar}>
                <div className={styles.statBarFill} style={{ width: '72%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div className={styles.socialProof}>
          <p className={styles.socialProofText}>Trusted by eco-conscious brands worldwide</p>
          <div className={styles.brandLogos}>
            <span className={styles.brandLogo}>🌿 EcoStore</span>
            <span className={styles.brandLogo}>🌱 GreenGoods</span>
            <span className={styles.brandLogo}>🍃 NatureCo</span>
            <span className={styles.brandLogo}>🌳 TreeWear</span>
          </div>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <span>Powered by</span>
            <a href="https://afforestation.org" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
              <img src="/afforestation-logo.png" alt="" className={styles.footerLogo} />
              afforestation.org
            </a>
          </div>
          <div className={styles.footerLinks}>
            <a href="https://afforestation.org/privacy">Privacy</a>
            <a href="https://afforestation.org/terms">Terms</a>
            <a href="https://afforestation.org/contact">Contact</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
