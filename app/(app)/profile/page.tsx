import type { Metadata } from "next";
import { ProfileScreen } from "@/components/profile/ProfileScreen";

export const metadata: Metadata = {
  title: "פרופיל / הגדרות | מכללת Ecom",
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
