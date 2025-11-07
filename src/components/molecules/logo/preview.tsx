"use client";
import { useTheme } from "next-themes";
import Image from "@/components/atoms/next/image";
import { cn } from "@/lib/utils/cn";

export function Preview({
  logo,
  darkModeLogo,
  appName,
}: {
  logo?: string | null;
  darkModeLogo?: string | null;
  appName: string;
}) {
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;

  if (currentTheme === "dark" && darkModeLogo) {
    return (
      <Image
        src={darkModeLogo}
        alt={appName}
        width={200}
        height={70}
        priority={true}
        className="h-auto max-h-full w-auto max-w-[200px] object-contain object-left"
      />
    );
  }

  if (logo) {
    return (
      <Image
        src={logo}
        alt={appName}
        width={200}
        height={70}
        priority={true}
        className="h-auto max-h-full w-auto max-w-[200px] object-contain object-left"
      />
    );
  }

  return (
    <span
      className={cn(
        "font-bold leading-none text-steel-700 dark:text-steel-100"
      )}
    >
      {appName}
    </span>
  );
}
