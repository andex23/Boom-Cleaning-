import Link from "next/link";
import styles from "./AdminCollection.module.css";
export function CollectionSummary({items}:{items:{label:string;value:string|number}[]}) {
  return <div className={styles.summary}>{items.map(item => <div className={styles.metric} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>;
}
export function EmptyCollection({kind,title,description,action}:{kind:"bookings"|"inbox"|"customers"|"payments";title:string;description:string;action?:{href:string;label:string}}) {
  const path={bookings:"M7 3v4M17 3v4M4 10h16M7 14h3M14 14h3M7 18h3",inbox:"M4 6h16v12H4zM4 6l8 7 8-7",customers:"M8 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M14 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M3 7h4M5 5v4",payments:"M5 3h14v18l-3-2-4 2-4-2-3 2V3M8 8h8M8 12h5"}[kind];
  return <div className={styles.empty}><span className={styles.emptyIcon}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==="bookings" && <rect x="4" y="5" width="16" height="16" rx="2" />}<path d={path} /></svg></span><h2>{title}</h2><p>{description}</p>{action && <Link href={action.href}>{action.label}</Link>}</div>;
}
