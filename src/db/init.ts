import { appDb } from "@/db/appDb";
import { builtinRuleHintsSeed, builtinTagsSeed } from "@/db/seeds";

export async function ensureAppSeeds() {
  const [tagCount, ruleCount] = await Promise.all([
    appDb.tags.count(),
    appDb.rule_hints.count(),
  ]);

  if (tagCount === 0) {
    await appDb.tags.bulkPut(builtinTagsSeed);
  }

  if (ruleCount === 0) {
    await appDb.rule_hints.bulkPut(builtinRuleHintsSeed);
  }
}
