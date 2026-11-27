import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { domainClass, type Domain } from "@/lib/db/domain";
import { BrandMark } from "./brand-mark";
import { UnitObject } from "./unit-object";

export type OrbitUnit = { id: string; code: string; gradeCode: string; domain: Domain; title: string };

/**
 * The hero object: the seven unit worlds orbit a glowing core. Pure CSS animation (no JS),
 * pauses on hover/focus so a unit is easy to tap, and every node links to its unit page.
 */
export function HeroOrbit({ units, label }: { units: OrbitUnit[]; label: string }) {
  return (
    <nav aria-label={label} className="orbit-wrap">
      <div className="orbit-ring" aria-hidden />
      <div className="orbit-ring orbit-ring-inner" aria-hidden />
      <div className="orbit-core" aria-hidden>
        <BrandMark className="size-9 sm:size-11" />
      </div>
      <ul className="orbit">
        {units.map((u, i) => (
          <li key={u.id} className={`orbit-item ${domainClass(u.domain)}`} style={{ ["--i" as string]: i, ["--n" as string]: units.length } as CSSProperties}>
            <div className="orbit-counter">
              <Link href={`/units/${u.gradeCode}/${u.code}`} className="orbit-node tile object-panel" aria-label={`${u.code}: ${u.title}`} title={u.title}>
                <UnitObject domain={u.domain} />
                <span className="orbit-badge" aria-hidden>
                  {u.code}
                </span>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}
