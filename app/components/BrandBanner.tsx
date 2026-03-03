import { Text, InlineStack, Badge } from "@shopify/polaris";
import styles from "../styles/components/brand-banner.module.css";

interface BrandBannerProps {
  title: string;
  subtitle: string;
  isActive: boolean;
  logoSrc?: string;
}

export function BrandBanner({ title, subtitle, isActive, logoSrc = "/logo.png" }: BrandBannerProps) {
  return (
    <div className={styles.banner}>
      <InlineStack gap="300" blockAlign="center">
        <div className={styles.logoCircle}>
          <img src={logoSrc} alt="Afforestation" className={styles.logoImg} />
        </div>
        <div>
          <Text as="p" variant="bodyMd" fontWeight="bold">
            {title}
          </Text>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </InlineStack>
      {isActive && <Badge tone="success">Active</Badge>}
    </div>
  );
}
