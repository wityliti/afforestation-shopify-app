import { Text } from "@shopify/polaris";
import styles from "../styles/components/stat-card.module.css";

interface StatCardProps {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  sublabel?: string;
}

export function StatCard({ icon, iconColor, value, label, sublabel }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.icon} style={{ color: iconColor }}>
        <i className={icon}></i>
      </div>
      <Text as="p" variant="heading2xl" fontWeight="bold">
        {value}
      </Text>
      <Text as="p" variant="bodyMd" tone="subdued">{label}</Text>
      {sublabel && (
        <Text as="p" variant="bodySm" tone="subdued">
          {sublabel}
        </Text>
      )}
    </div>
  );
}
