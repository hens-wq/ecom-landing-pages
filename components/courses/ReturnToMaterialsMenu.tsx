import Link from "next/link";
import { BookOpen, ChevronDown, PlayCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/**
 * Lets a rep leave the exam mid-attempt to review the Playbook or Oz's
 * video, then come back. The exam itself preserves all progress (see
 * QuizScreen's draft persistence) - this menu is just the entry point.
 */
export function ReturnToMaterialsMenu({ courseSlug }: { courseSlug: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="size-4" />
          חזרה לחומרי הלמידה
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>התשובות שלכם נשמרות אוטומטית</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/courses/${courseSlug}`}>
            <BookOpen className="size-4" />
            חזרה לחומרי הלמידה
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/courses/${courseSlug}/video`}>
            <PlayCircle className="size-4" />
            צפייה בסרטון ההסבר
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
