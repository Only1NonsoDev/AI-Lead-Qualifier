const STEPS = [
  { title: "Capture", body: "Leads arrive from the web form, demo requests, chat and event lists. Each one gets a timer, because replying within 5 minutes makes a sale far more likely." },
  { title: "Score", body: "Out of 100: how well the company fits (size, industry, country, job title: 50 points), how serious they sound (Budget, Authority, Need, Timeline from their message: 40 points) and what they did on our site (10 points). Every factor shows its points and a plain reason." },
  { title: "Flag", body: "Obvious junk (disposable email, keyboard mashing, \"test\" text) and repeat submissions (same email or company) are flagged, with a suggestion to discard or merge." },
  { title: "Route", body: "An ordered list of rules you can edit picks an owner: the first rule that matches wins. The lead shows which rule matched." },
  { title: "Decide", body: "A person always decides: Approve, Override (with a reason) or Disqualify. Everything is written to the activity log." },
  { title: "Reply & export", body: "Each lead has a draft reply to edit and copy. Approved leads export as CSV for HubSpot or Salesforce." },
];

export default function HowItWorks() {
  return (
    <section className="how stack" aria-labelledby="how-title" data-testid="how-it-works">
      <div className="page-head">
        <h1 className="h1-sm" id="how-title">How it works</h1>
        <p className="muted">Lead Desk helps a sales team decide quickly who to talk to first. It suggests; people decide.</p>
      </div>
      <ol className="how-grid">
        {STEPS.map((s, i) => (
          <li key={s.title} className="panel how-card">
            <span className="how-num" aria-hidden="true">{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="panel panel-regular privacy">
        <h3>Hot, Warm, Cold</h3>
        <p>Hot is 70 or more: call today. Warm is 40 to 69: follow up this week. Cold is under 40: add to a nurture email sequence and check back later.</p>
      </div>
      <div className="panel panel-regular privacy">
        <h3>Nothing is sent</h3>
        <p>This app never emails, calls or messages anyone and never writes to a CRM. Drafts are text you copy yourself, and exports are files you download and import yourself.</p>
      </div>
      <div className="panel panel-regular privacy">
        <h3>Your data and API key</h3>
        <p>This site is fully static: no server, no database. Demo state is saved in this browser&apos;s local storage and Reset demo wipes it. The scorer is rule-based and works with no key. If you add your own OpenAI or Anthropic key it is kept only in this tab&apos;s memory (or session storage if you tick the box), goes straight from your browser to the provider, and is never written to the saved demo. Only the lead&apos;s text and fixed scores are sent, to reword reasons and the draft. If the call fails, the rule-based text stays.</p>
      </div>
      <div className="panel panel-regular privacy">
        <h3>Keyboard shortcuts</h3>
        <p><kbd>j</kbd> next lead, <kbd>k</kbd> previous lead, <kbd>a</kbd> approve the suggestion. They work in the inbox when you are not typing in a field.</p>
      </div>
    </section>
  );
}
