export const BOARD_KNOWLEDGE_AREAS = [
  { key: "nonprofit_finance",    label: "Nonprofit Finance & Treasurer Skills",           tier: 1, tierLabel: "Critical for Survival & Compliance" },
  { key: "governance_legal",     label: "Nonprofit Governance & Legal Knowledge",          tier: 1, tierLabel: "Critical for Survival & Compliance" },
  { key: "workforce_development",label: "Workforce Development & Education Policy",        tier: 1, tierLabel: "Critical for Survival & Compliance" },
  { key: "lived_experience",     label: "Lived Experience as a Non-Traditional Learner",   tier: 2, tierLabel: "Essential for Mission & Growth" },
  { key: "fundraising",          label: "Fundraising & Major Gifts",                       tier: 2, tierLabel: "Essential for Mission & Growth" },
  { key: "ai_ethics",            label: "AI Ethics & Responsible Technology",              tier: 2, tierLabel: "Essential for Mission & Growth" },
  { key: "software_engineering", label: "Software Development & Engineering Leadership",   tier: 3, tierLabel: "Important for Specific Functions" },
  { key: "marketing_comms",      label: "Marketing, Communications & Storytelling",        tier: 3, tierLabel: "Important for Specific Functions" },
  { key: "community_orgs",       label: "Community Organization Leadership",               tier: 3, tierLabel: "Important for Specific Functions" },
  { key: "human_resources",      label: "Human Resources & Organizational Development",    tier: 4, tierLabel: "Strengthens Specific Capabilities" },
  { key: "dei_strategy",         label: "Diversity, Equity & Inclusion Strategy",          tier: 4, tierLabel: "Strengthens Specific Capabilities" },
  { key: "government_relations", label: "Government Relations & Public Sector Navigation", tier: 4, tierLabel: "Strengthens Specific Capabilities" },
] as const;

export const EXPERTISE_LEVELS = [
  { value: "none",     label: "None",     activeBg: "bg-slate-100",   activeText: "text-slate-500",   activeBorder: "border-slate-300" },
  { value: "novice",   label: "Novice",   activeBg: "bg-blue-50",     activeText: "text-blue-700",    activeBorder: "border-blue-300" },
  { value: "moderate", label: "Moderate", activeBg: "bg-teal-50",     activeText: "text-teal-700",    activeBorder: "border-teal-300" },
  { value: "heavy",    label: "Heavy",    activeBg: "bg-amber-50",    activeText: "text-amber-700",   activeBorder: "border-amber-300" },
  { value: "expert",   label: "Expert",   activeBg: "bg-emerald-50",  activeText: "text-emerald-700", activeBorder: "border-emerald-300" },
] as const;

export type ExpertiseLevel = "none" | "novice" | "moderate" | "heavy" | "expert";

function getLevelMeta(value: string) {
  return EXPERTISE_LEVELS.find(l => l.value === value) ?? EXPERTISE_LEVELS[0];
}

interface Props {
  value: Record<string, string>;
  onChange?: (v: Record<string, string>) => void;
  readOnly?: boolean;
}

export default function BoardExpertiseRater({ value, onChange, readOnly = false }: Props) {
  const tiers = [1, 2, 3, 4];
  const tierAreas = (tier: number) => BOARD_KNOWLEDGE_AREAS.filter(a => a.tier === tier);

  return (
    <div className="space-y-5">
      {tiers.map(tier => {
        const areas = tierAreas(tier);
        const tierLabel = areas[0].tierLabel;
        return (
          <div key={tier}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Tier {tier} — {tierLabel}
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <div className="space-y-1">
              {areas.map(area => {
                const current = value[area.key] ?? "none";
                const meta = getLevelMeta(current);

                if (readOnly) {
                  return (
                    <div
                      key={area.key}
                      className="flex items-center justify-between py-1.5 px-1"
                      data-testid={`expertise-row-${area.key}`}
                    >
                      <span className="text-sm text-[#1A1F2B] leading-snug flex-1 pr-3">{area.label}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${meta.activeBg} ${meta.activeText} ${meta.activeBorder}`}
                        data-testid={`expertise-badge-${area.key}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={area.key}
                    className="py-2 px-1 rounded-lg hover:bg-slate-50/80 transition-colors"
                    data-testid={`expertise-row-${area.key}`}
                  >
                    <p className="text-sm text-[#1A1F2B] mb-1.5 leading-snug">{area.label}</p>
                    <div className="flex gap-1 flex-wrap">
                      {EXPERTISE_LEVELS.map(level => {
                        const isSelected = current === level.value;
                        return (
                          <button
                            key={level.value}
                            type="button"
                            onClick={() => onChange?.({ ...value, [area.key]: level.value })}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                              isSelected
                                ? `${level.activeBg} ${level.activeText} ${level.activeBorder} shadow-sm`
                                : "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-500"
                            }`}
                            data-testid={`expertise-btn-${area.key}-${level.value}`}
                          >
                            {level.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
