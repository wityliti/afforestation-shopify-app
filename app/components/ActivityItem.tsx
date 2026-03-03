import { Text } from "@shopify/polaris";
import styles from "../styles/components/activity-item.module.css";

interface ActivityItemProps {
  description: string;
  date: string;
}

export function ActivityItem({ description, date }: ActivityItemProps) {
  return (
    <div className={styles.item}>
      <Text as="p" variant="bodyMd">{description}</Text>
      <Text as="p" variant="bodySm" tone="subdued">{date}</Text>
    </div>
  );
}

export function ActivityEmpty() {
  return (
    <div className={styles.empty}>
      <Text as="p" variant="bodyMd" tone="subdued">
        No recent activity yet. Trees will appear here once orders are placed.
      </Text>
    </div>
  );
}
