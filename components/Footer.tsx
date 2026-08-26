import Link from "next/link";
import type { FooterContent } from "@/data/types";
import { fadeUpSm, stagger } from "@/lib/motion";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";

interface FooterProps {
  content: FooterContent;
}

/** Server component — only the reveal wrappers are client. */
export function Footer({ content }: FooterProps) {
  return (
    <footer className="border-t border-bone/10">
      <RevealGroup className="mx-auto max-w-container px-gutter py-16 lg:px-gutter-lg lg:py-20">
        <div className="lg:flex lg:items-start lg:justify-between lg:gap-16">
          {/* Wordmark */}
          <RevealItem variants={fadeUpSm}>
            <Link
              href="/"
              className="headline block whitespace-nowrap text-5xl leading-none tracking-tight text-bone lg:text-7xl"
            >
              {content.wordmark}
            </Link>
            <p className="mt-4 text-sm text-bone/50">{content.tagline}</p>
          </RevealItem>

          {/* Links */}
          <RevealItem as="ul" variants={stagger(0.05)} className="mt-12 lg:mt-2 lg:w-72">
            {content.links.map((link) => (
              <RevealItem
                key={link.href}
                as="li"
                variants={fadeUpSm}
                className="border-b border-bone/10"
              >
                <Link
                  href={link.href}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex items-center justify-between py-4 text-label font-bold uppercase text-bone/60 transition-colors duration-200 ease-in-out hover:text-bone"
                >
                  {link.label}
                  <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
                </Link>
              </RevealItem>
            ))}
          </RevealItem>
        </div>

        <RevealItem
          as="p"
          variants={fadeUpSm}
          className="mt-16 text-label font-bold uppercase text-bone/40"
        >
          {content.copyright}
        </RevealItem>
      </RevealGroup>
    </footer>
  );
}
