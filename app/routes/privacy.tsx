import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import styles from "./_index/styles.module.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | Afforestation Shopify App" },
    { name: "description", content: "Privacy policy for the Afforestation Shopify App - how we handle your data" },
  ];
};

export default function PrivacyPolicy() {
  return (
    <div className={styles.page} style={{ minHeight: '100vh' }}>
      <div className={styles.bgLayer1} />
      <div className={styles.bgLayer2} />
      <div className={styles.bgLayer3} />
      <div className={styles.gradientTop} />
      <div className={styles.gradientBottom} />

      <div className={styles.content} style={{ opacity: 1, maxWidth: '800px' }}>
        {/* Header */}
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className={styles.logoSection} style={{ marginBottom: '2rem' }}>
            <div className={styles.logoWrapper}>
              <div className={styles.logoContainer} style={{ width: '80px', height: '80px' }}>
                <img 
                  src="/afforestation-logo.png" 
                  alt="Afforestation" 
                  className={styles.logoImage}
                  style={{ width: '50px', height: '50px' }}
                />
              </div>
            </div>
            <span className={styles.brandName} style={{ fontSize: '1.25rem', marginTop: '1rem' }}>
              afforestation.org
            </span>
          </div>
        </Link>

        {/* Content */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '3rem',
          marginBottom: '2rem',
          color: 'rgba(255, 255, 255, 0.9)',
          lineHeight: '1.8',
        }}>
          <h1 style={{ 
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
            fontWeight: 600, 
            color: 'white', 
            marginBottom: '2rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '1rem'
          }}>
            Privacy Policy
          </h1>
          
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '2rem' }}>
            Last updated: January 23, 2026
          </p>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              1. Introduction
            </h2>
            <p>
              Afforestation ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Shopify application.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              2. Information We Collect
            </h2>
            <p style={{ marginBottom: '1rem' }}>We collect minimal data necessary to provide our tree-planting service:</p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Store Information:</strong> Your Shopify store domain and name</li>
              <li><strong>Order Data:</strong> Order totals (not customer personal information) to calculate tree contributions</li>
              <li><strong>App Settings:</strong> Your configured preferences for tree planting triggers</li>
            </ul>
            <p>
              <strong>We do NOT collect or store:</strong> Customer names, emails, addresses, payment information, or any other personally identifiable customer data.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              3. How We Use Your Information
            </h2>
            <p style={{ marginBottom: '1rem' }}>We use the collected information to:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Calculate the number of trees to plant based on your orders</li>
              <li>Display impact statistics on your storefront widgets</li>
              <li>Generate sustainability reports for your business</li>
              <li>Improve and optimize our services</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              4. Data Storage and Security
            </h2>
            <p style={{ marginBottom: '1rem' }}>We implement industry-standard security measures:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>All data is encrypted at rest and in transit (TLS 1.3)</li>
              <li>Data is stored in secure, SOC 2 compliant cloud infrastructure</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and authentication for all systems</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              5. Data Retention
            </h2>
            <p>
              We retain your data for as long as your app is installed. Upon uninstallation, we retain aggregated, anonymized impact data for reporting purposes. Personal store information is deleted within 30 days of uninstallation upon request.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              6. Data Sharing
            </h2>
            <p style={{ marginBottom: '1rem' }}>We do not sell your data. We may share data only with:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Tree-planting partners (only aggregated tree counts, no store data)</li>
              <li>Service providers who assist in operating our app (under strict confidentiality)</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              7. Your Rights
            </h2>
            <p style={{ marginBottom: '1rem' }}>You have the right to:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Access your stored data</li>
              <li>Request data correction or deletion</li>
              <li>Export your impact data</li>
              <li>Withdraw consent at any time by uninstalling the app</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              8. GDPR Compliance
            </h2>
            <p>
              We comply with the General Data Protection Regulation (GDPR). We process data based on legitimate interest and consent. EU users can request data access, portability, or erasure by contacting us.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              9. Contact Us
            </h2>
            <p>
              For privacy-related inquiries, contact us at:<br />
              <a href="mailto:privacy@afforestation.org" style={{ color: '#4ade80' }}>privacy@afforestation.org</a>
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>
        </div>

        {/* Back link */}
        <Link 
          to="/" 
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#4ade80',
            textDecoration: 'none',
            fontSize: '0.9rem',
            marginBottom: '2rem'
          }}
        >
          ← Back to Home
        </Link>

        {/* Footer */}
        <footer className={styles.footer} style={{ opacity: 1 }}>
          <div className={styles.footerContent}>
            <span>Powered by</span>
            <a href="https://afforestation.org" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
              <img src="/afforestation-logo.png" alt="" className={styles.footerLogo} />
              afforestation.org
            </a>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
