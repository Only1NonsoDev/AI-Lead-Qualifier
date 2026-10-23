import { NURTURE_LABEL } from "./routing";
import type { Lead, Tier } from "./types";

/** First-reply email. It is only text for the rep to edit and copy; the app never sends anything. */
export function draftReply(lead: Lead, tier: Tier, owner: string, repName: string): string {
  const hi = `Hi ${lead.firstName || "there"},`;
  const topic = lead.message.trim() ? firstSentence(lead.message) : "";
  const thanks =
    lead.source === "demo request"
      ? `Thanks for asking for a demo of Lead Desk.`
      : lead.source === "event list"
        ? `It was great to meet you at the event, and thanks for stopping by.`
        : lead.source === "chat"
          ? `Thanks for chatting with us earlier.`
          : `Thanks for getting in touch with us.`;
  const echo = topic ? `You mentioned: "${topic}" That is exactly the kind of thing we help ${lead.company || "teams"} with.` : "";
  let ask: string;
  if (owner === NURTURE_LABEL || tier === "cold")
    ask = "No pressure at all. I will send over a short guide on how teams like yours set up their lead process, and you can reply any time if you would like to talk.";
  else if (tier === "hot")
    ask = "Could you do a 20 minute call today or tomorrow? Reply with a time that suits you, or pick one here: [your calendar link].";
  else ask = "Would a short call next week be useful? Reply with a couple of times that work for you and I will make it happen.";
  const sign = repName || (owner && owner !== NURTURE_LABEL ? owner : "The Lead Desk team");
  return [hi, "", thanks, echo, ask, "", "Best,", sign].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n").replace(/\n\n\n+/g, "\n\n");
}

function firstSentence(msg: string): string {
  const clean = msg.replace(/\s+/g, " ").trim();
  const m = clean.match(/^.*?[.!?](\s|$)/);
  const s = (m ? m[0] : clean).trim();
  return s.length > 140 ? `${s.slice(0, 137)}...` : s;
}
