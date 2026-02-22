'use strict';

const Anthropic = require('@anthropic-ai/sdk');

// ── Static fallback plans (one per tier) ─────────────────────────────────────
// Used when Claude is unavailable or times out. User never sees an error.
const FALLBACK_PLANS = {
  'Peace Champion': `Day 1: Lock In Your Legacy Contacts
You already have the foundation. Today, verify that the people you've listed as legacy contacts on your phone and accounts are still the right people — and that they know they've been chosen.

Day 2: Audit Your Password Vault
Open your password manager and scan for any accounts you've added in the last 6 months that aren't yet inside it. Spend 20 minutes bringing it fully up to date.

Day 3: Check Your 2FA Recovery Codes
For every account with two-factor authentication enabled, confirm your backup codes are saved somewhere a trusted person could access — not just on the device itself.

Day 4: Review Your Social Media Memorialization Settings
Log into Facebook, Instagram, and Google and verify your memorialization or inactive account preferences are set exactly as you want them.

Day 5: Update Your Document Vault
Add any new insurance policies, financial account changes, or legal updates from the past year to your secure document folder.

Day 6: Brief Your Legacy Contact
Spend 15 minutes with the person responsible for your digital life. Walk them through where everything lives. Even champions need a co-pilot who is truly ready.

Day 7: Set a 6-Month Review Reminder
Your digital life changes. Book a calendar event right now to repeat this review in six months. You've built something worth protecting — keep it current.`,

  'On Your Way': `Day 1: Set Up a Legacy Contact on Your Phone
On iPhone: Settings → [Your Name] → Password & Security → Legacy Contact. On Android: use Google's Inactive Account Manager. This single step unlocks your device for a loved one if you can't.

Day 2: Choose One Password Manager and Commit
Pick 1Password, Bitwarden, or iCloud Keychain — whichever you're most likely to actually use. Install it today and add your five most important account credentials.

Day 3: Enable 2FA on Email and Banking
These two accounts are your master keys. Turn on two-factor authentication and save the backup recovery codes somewhere your trusted person can find.

Day 4: Create Your Digital Account List
Open a document (Google Doc or a notes app) and list every account you'd want someone to know about: email, banking, social media, subscriptions. Don't worry about passwords yet — just the list.

Day 5: Set Social Media to Memorialization Mode
Visit your Facebook and Instagram settings and assign a legacy contact or set account preferences for after your death. Takes under 10 minutes per platform.

Day 6: Tell One Person Where to Find Your Information
You don't need everything perfect. Just tell someone you trust: "If something happens to me, here's where to start." A conversation beats a perfect system no one knows about.

Day 7: Back Up Three Things to the Cloud
Identify your three most irreplaceable digital files — photos, documents, recordings — and confirm they are backed up to iCloud, Google Drive, or Dropbox today.`,

  'Getting Clarity': `Day 1: Write Down Your Three Most Critical Accounts
Just three: your primary email, your main bank, and your phone carrier. Write down the account name and where the login is stored. This is the foundation everything else is built on.

Day 2: Set Up a Free Password Manager
Download Bitwarden (free) or use iCloud Keychain if you're on iPhone. Add those three accounts from Day 1. That's it for today — small steps, real progress.

Day 3: Set Up a Legacy Contact on Your Phone
iPhone: Settings → [Your Name] → Password & Security → Legacy Contact. Android: Google Account → Data & Privacy → Plan what happens when you can no longer use your account. Five minutes. Done.

Day 4: Tell Someone About Your Email Password
Your email is the master key to every other account. Tell one trusted person how to get into it — or write it down and give them a sealed envelope. This single action covers more ground than almost anything else.

Day 5: Enable Two-Factor Authentication on Your Email
Go to your email settings and turn on 2FA. Use an authenticator app or SMS. Then save your backup codes somewhere physical — a notebook, a card in your wallet.

Day 6: Back Up Your Most Important Photos
Go to your phone's camera roll. Find the photos you'd be devastated to lose. Enable iCloud Photos, Google Photos, or move them to a shared folder someone else can access.

Day 7: Have the Conversation
Text or call the person you'd want to manage your digital life and say: "I've been doing some organizing. Can we talk for 10 minutes so you know what to do if I can't?" That conversation is your biggest protection.`,

  'Starting Fresh': `Day 1: Just Write Three Things Down
On any piece of paper or in your phone notes, write: your main email address, your phone number, and the name of your primary bank. That's it. You've started.

Day 2: Choose Your Trusted Person
Decide who you trust most to manage your digital life in an emergency. This doesn't need to be formal today. Just make the decision and send them a message saying "I want to talk about something important soon."

Day 3: Set Up a Free Password Manager
Go to bitwarden.com and create a free account. Watch their 3-minute setup video. Add your email password. One account in the vault is a complete success for today.

Day 4: Give Someone Your Phone Passcode
Write your phone passcode on a piece of paper, seal it in an envelope, label it with your name, and give it to your trusted person. Tell them: "Open this only if you absolutely need to." This one act unlocks almost everything.

Day 5: Find Out Where Your Important Documents Are
Look around your home and phone. Where are your insurance cards, your lease or mortgage info, your bank statements? You don't need to organize them today — just find them and take a photo of each on your phone.

Day 6: Download Google Photos or iCloud
Turn on automatic backup for your phone camera roll. This protects everything you've photographed — memories that cannot be replaced. Takes two minutes to enable.

Day 7: Tell Your Trusted Person What You've Done
Call or text them: "I've spent a week getting organized. Here's what I've set up and where things are." Read them your Day 1 list. Walk them through the envelope. That conversation is your plan working.`,
};

// ── Build the prompt payload ──────────────────────────────────────────────────
function buildPrompt(payload) {
  const { name, readiness_score, tier, jesse_signals, lowest_domain } = payload;

  const signalsList = jesse_signals.length > 0
    ? jesse_signals.map(s => `- ${s}`).join('\n')
    : '- No critical gaps identified';

  const domainLabel = lowest_domain.replace(/_/g, ' ');

  return {
    system: `You are Jesse, ENDevo's warm and trusted digital readiness guide.
You help people feel prepared and clear — not scared or overwhelmed.
Your tone is: warm, direct, practical, encouraging. Never legal or clinical.
No estate planning language. No medical or financial advice. Educational only.`,

    user: `Generate a 7-day action plan for ${name}.
Their Readiness Score is ${readiness_score}/100. Their tier is: ${tier}.
Their critical gaps are:
${signalsList}
Their weakest domain is: ${domainLabel}.

Format the output as plain text exactly like this:
Day 1: [Short Title]
[2-3 sentence warm, actionable description]

Day 2: [Short Title]
[2-3 sentence warm, actionable description]

...continue for Day 3 through Day 7.

Rules:
- Plain text only. No markdown. No #, *, **, __, >, or bullet symbols.
- Each day must start with "Day N:" on its own line.
- Each action must be specific and achievable in under 30 minutes.
- Match urgency to their tier. Do not mention legal documents, attorneys, or financial advisors.`,
  };
}

// ── Call Claude with 10-second timeout, fall back silently ───────────────────
async function generatePlan(payload) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const hasKey = apiKey && apiKey !== 'your_anthropic_api_key_here';

  if (!hasKey) {
    console.log('[AI] No API key — using static fallback plan');
    return { plan: FALLBACK_PLANS[payload.tier] ?? FALLBACK_PLANS['Starting Fresh'], source: 'static' };
  }

  try {
    const client = new Anthropic({ apiKey });
    const { system, user } = buildPrompt(payload);
    const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS) || 10000;

    const response = await Promise.race([
      client.messages.create({
        model: process.env.AI_MODEL || 'claude-sonnet-4-6',
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), timeoutMs)
      ),
    ]);

    const plan = response.content?.[0]?.text ?? '';
    console.log('[AI] Claude plan generated successfully');
    return { plan, source: 'ai' };

  } catch (err) {
    console.error('[AI] Claude call failed — using static fallback:', err.message);
    return { plan: FALLBACK_PLANS[payload.tier] ?? FALLBACK_PLANS['Starting Fresh'], source: 'static' };
  }
}

module.exports = { generatePlan };
