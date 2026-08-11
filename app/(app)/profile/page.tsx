import type { Metadata } from "next";
import { ProfileScreen } from "@/components/profile/ProfileScreen";

export const metadata: Metadata = {
  title: "פרופיל / הגדרות | אקדמיית איקום",
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
