import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.page}>
      {/* Background */}
      <div className={styles.backgroundImage} />
      <div className={styles.overlay} />

      {/* Content */}
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C12 2 7 7 7 12C7 14.5 8.5 16.5 10.5 17.5V22H13.5V17.5C15.5 16.5 17 14.5 17 12C17 7 12 2 12 2Z" fill="#16a34a"/>
            <path d="M12 6C12 6 10 9 10 11C10 12.5 11 13.5 12 14C13 13.5 14 12.5 14 11C14 9 12 6 12 6Z" fill="#22c55e"/>
            <circle cx="12" cy="11" r="1.5" fill="#dcfce7"/>
          </svg>
        </div>

        {/* Headline */}
        <h1 className={styles.headline}>
          Plant trees with
          <br />
          <span className={styles.headlineLight}>every sale</span>
        </h1>

        {/* Subtitle */}
        <p className={styles.subtitle}>
          Turn your Shopify store into a force for reforestation.
          <br />
          Automatic tree planting with every order—tracked and verified.
        </p>

        {/* Login Form */}
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <div className={styles.inputGroup}>
              <input
                className={styles.input}
                type="text"
                name="shop"
                placeholder="your-store.myshopify.com"
                autoComplete="off"
                autoFocus
              />
              <button className={styles.submitButton} type="submit">
                Connect Store
              </button>
            </div>
            <span className={styles.inputHint}>Enter your Shopify store domain to get started</span>
          </Form>
        )}

        {/* Features */}
        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div className={styles.featureText}>
              <strong>Verified Impact</strong>
              <span>Real trees planted with GPS coordinates and growth tracking</span>
            </div>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div className={styles.featureText}>
              <strong>Customer Widget</strong>
              <span>Display your impact on your storefront with our theme extension</span>
            </div>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div className={styles.featureText}>
              <strong>ESG Dashboard</strong>
              <span>Connect to your company account for unified impact reporting</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>1M+</span>
            <span className={styles.statLabel}>Trees Planted</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNumber}>500+</span>
            <span className={styles.statLabel}>Stores Connected</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNumber}>20K</span>
            <span className={styles.statLabel}>Tons CO₂ Offset</span>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span>Powered by</span>
          <a href="https://afforestation.org" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
            afforestation.org
          </a>
        </div>
      </div>
    </div>
  );
}
