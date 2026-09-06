import {
  Home,
  Building2,
  Map,
  GraduationCap,
  UserSearch,
  Target,
  Bot,
  Settings,
  ShieldCheck,
  BrainCircuit,
  Code2,
  PenTool,
  TrendingUp,
  Video,
  ClipboardCheck,
  FileCheck2,
  Users,
  Briefcase,
  Award,
  Handshake,
  PlayCircle,
  HelpCircle,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Building2,
  Map,
  GraduationCap,
  UserSearch,
  Target,
  Bot,
  Settings,
  ShieldCheck,
  BrainCircuit,
  Code2,
  PenTool,
  TrendingUp,
  Video,
  ClipboardCheck,
  FileCheck2,
  Users,
  Briefcase,
  Award,
  Handshake,
  PlayCircle,
  PartyPopper,
};

export const DEFAULT_ICON: LucideIcon = HelpCircle;

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? DEFAULT_ICON;
}
