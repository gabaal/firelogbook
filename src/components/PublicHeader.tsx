import Link from "next/link";
import { Flame } from "@/components/icons";

/** Header for the public, crawlable pages (home uses its own copy). */
export default function PublicHeader() {
  return (
    <header className="topbar">
      <div className="shell topbar-in">
        <Link href="/" className="brand" aria-label="FireLogbook">
          <span className="brand-mark">
            <Flame size={15} />
          </span>
          FireLogbook
        </Link>
        <nav className="topnav">
          <Link href="/checks" className="hidden-sm">
            The 13 checks
          </Link>
          <Link href="/free-logbook" className="hidden-sm">
            Free log book
          </Link>
          <Link href="/signin">Sign in</Link>
          <Link href="/signin" className="btn btn-sm" style={{ marginLeft: 4 }}>
            Start free trial
          </Link>
        </nav>
      </div>
    </header>
  );
}
