interface SectionHeadingProps {
  title: string;
  description: string;
  eyebrow?: string;
  level?: 1 | 2;
}

export function SectionHeading({ title, description, eyebrow, level = 1 }: SectionHeadingProps) {
  const Heading = `h${level}` as const;
  return (
    <header className="section-head">
      {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
      <Heading className="section-title">{title}</Heading>
      <p className="section-desc">{description}</p>
    </header>
  );
}
