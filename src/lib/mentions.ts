export type MentionPerson = {
  id: string;
  name: string | null;
  email: string;
};

function isBoundary(char: string) {
  return !/[A-Za-z0-9_]/.test(char);
}

function mentionSpans(body: string, people: MentionPerson[]) {
  const lower = body.toLowerCase();
  const hits: { id: string; start: number; end: number }[] = [];
  for (const person of people) {
    const needles: string[] = [];
    const email = person.email.trim();
    if (email.length > 0) {
      needles.push(email);
    }
    const name = person.name?.trim().replace(/\s+/g, " ") ?? "";
    if (name.length >= 2) {
      needles.push(name);
    }
    for (const needle of needles) {
      const token = `@${needle.toLowerCase()}`;
      let from = 0;
      while (from < lower.length) {
        const start = lower.indexOf(token, from);
        if (start < 0) {
          break;
        }
        const before = start === 0 ? " " : (lower[start - 1] ?? " ");
        const end = start + token.length;
        const after = end >= lower.length ? " " : (lower[end] ?? " ");
        if (isBoundary(before) && isBoundary(after)) {
          hits.push({ id: person.id, start, end });
        }
        from = end;
      }
    }
  }
  return hits.filter(
    (hit) =>
      !hits.some(
        (other) =>
          other.start <= hit.start &&
          other.end >= hit.end &&
          other.end - other.start > hit.end - hit.start,
      ),
  );
}

export function mentionedUserIds(body: string, people: MentionPerson[]) {
  return [...new Set(mentionSpans(body, people).map((hit) => hit.id))];
}

export function newlyMentioned(previousBody: string, nextBody: string, people: MentionPerson[]) {
  const already = new Set(mentionedUserIds(previousBody, people));
  return mentionedUserIds(nextBody, people).filter((id) => !already.has(id));
}
