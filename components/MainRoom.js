"use client";
import { useSelectedLayoutSegment } from "next/navigation";

// Every page except the home page sits in the navy "room" (the home page has its own banner and navy lots band).
export default function MainRoom({ children }) {
  const segment = useSelectedLayoutSegment();
  return <main className={segment ? "room" : undefined}>{children}</main>;
}
