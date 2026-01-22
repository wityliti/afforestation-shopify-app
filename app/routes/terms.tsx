import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import styles from "./_index/styles.module.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Service | Afforestation Shopify App" },
    { name: "description", content: "Terms of service for the Afforestation Shopify App" },
  ];
};

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '2rem' }}>
            Last updated: January 23, 2026
          </p>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By installing and using the Afforestation Shopify App ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              2. Description of Service
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Afforestation provides a service that enables Shopify merchants to contribute to global reforestation efforts. Our App:
            </p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Tracks orders and calculates tree contributions based on your settings</li>
              <li>Provides storefront widgets to display environmental impact</li>
              <li>Coordinates tree planting with verified reforestation partners</li>
              <li>Generates impact reports and certificates</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              3. Pricing and Payment
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              <strong>Free Installation:</strong> The App is free to install with no monthly fees.
            </p>
            <p style={{ marginBottom: '1rem' }}>
              <strong>Tree Planting Costs:</strong> You will be charged for trees planted based on your configured settings:
            </p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Standard trees: Starting at $0.50 per tree</li>
              <li>Premium verified trees: Starting at $1.00 per tree</li>
              <li>Carbon offset: Starting at $0.20 per kg CO₂</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              Billing occurs monthly through Shopify's billing system. You can set spending limits to control costs.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              4. Tree Planting Verification
            </h2>
            <p>
              We partner with certified reforestation organizations to plant real trees. Each tree comes with GPS coordinates and species information. While we strive for accuracy, actual planting may be subject to seasonal conditions and partner availability. We guarantee that funds collected for trees will be used exclusively for verified reforestation projects.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              5. User Responsibilities
            </h2>
            <p style={{ marginBottom: '1rem' }}>As a user, you agree to:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Provide accurate store and business information</li>
              <li>Not use the App for fraudulent or misleading environmental claims</li>
              <li>Maintain accurate representation of your environmental impact to customers</li>
              <li>Comply with all applicable laws and Shopify's terms of service</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              6. Intellectual Property
            </h2>
            <p>
              The Afforestation name, logo, and all related marks are our intellectual property. You may use our provided widgets and badges on your store, but may not modify our branding or misrepresent your association with Afforestation.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              7. Limitation of Liability
            </h2>
            <p>
              Afforestation provides the service "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the App. Our total liability shall not exceed the amount paid by you in the 12 months preceding any claim.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              8. Termination
            </h2>
            <p>
              You may terminate your use of the App at any time by uninstalling it from your Shopify store. We may terminate or suspend your access for violation of these terms or for any reason with 30 days notice. Upon termination, any pending tree planting contributions will be honored.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              9. Refund Policy
            </h2>
            <p>
              Due to the nature of tree planting (trees are planted based on your contributions), refunds are generally not available. However, if you believe you were charged in error, please contact us within 30 days and we will review your case.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              10. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify you of significant changes via email or through the App. Continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              11. Governing Law
            </h2>
            <p>
              These terms are governed by the laws of the jurisdiction where Afforestation is incorporated. Any disputes shall be resolved through binding arbitration.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4ade80', marginBottom: '1rem' }}>
              12. Contact
            </h2>
            <p>
              For questions about these terms, contact us at:<br />
              <a href="mailto:legal@afforestation.org" style={{ color: '#4ade80' }}>legal@afforestation.org</a>
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
