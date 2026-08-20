import { FD, InsurancePolicy } from "./db";

const CAL_API = "https://www.googleapis.com/calendar/v3";

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function fmtRupees(n: number): string {
  return `\u20b9${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function upsertEvent(
  accessToken: string,
  body: Record<string, unknown>,
  existingEventId: string | null
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  if (existingEventId) {
    const res = await fetch(`${CAL_API}/calendars/primary/events/${existingEventId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()).id;
    if (res.status !== 404) {
      throw new Error(`Calendar update failed: ${res.status} ${await res.text()}`);
    }
    // fall through to insert if the old event was deleted (404)
  }

  const res = await fetch(`${CAL_API}/calendars/primary/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Calendar insert failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).id;
}

export async function createOrUpdateMaturityEvent(accessToken: string, fd: FD): Promise<string> {
  const body = {
    summary: `FD Maturity \u2014 ${fd.bank} ${fd.fd_number || fd.id}`,
    description:
      `VAULT FD Management\n\n` +
      `Profile: ${fd.profile_name || "Family"}\n` +
      `Bank: ${fd.bank}\n` +
      `FD Number: ${fd.fd_number || "-"}\n` +
      `Principal: ${fmtRupees(fd.amount)}\n` +
      `Interest Rate: ${fd.interest.toFixed(2)}%\n` +
      `Maturity Amount: ${fmtRupees(fd.maturity_amount)}\n` +
      `Net Maturity: ${fmtRupees(fd.net_maturity)}\n\n` +
      `Managed by VAULT.`,
    start: { date: fd.maturity_date },
    end: { date: nextDay(fd.maturity_date) },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 43200 },
        { method: "popup", minutes: 10080 },
        { method: "popup", minutes: 1440 },
      ],
    },
  };
  return upsertEvent(accessToken, body, fd.calendar_event_id);
}

export async function createOrUpdateInsuranceEvent(
  accessToken: string,
  policy: InsurancePolicy
): Promise<string> {
  const body = {
    summary: `Insurance Premium \u2014 ${policy.company} ${policy.policy_number}`,
    description:
      `VAULT Insurance\n\n` +
      `Profile: ${policy.profile_name || "Family"}\n` +
      `Company: ${policy.company}\n` +
      `Policy: ${policy.policy_number}\n` +
      `Type: ${policy.policy_type}\n` +
      `Insured: ${policy.insured_name || "-"}\n` +
      `Premium: ${fmtRupees(policy.premium_amount)}\n` +
      `Frequency: ${policy.premium_frequency || "-"}\n\n` +
      `Managed by VAULT.`,
    start: { date: policy.next_premium_date },
    end: { date: nextDay(policy.next_premium_date) },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 10080 },
        { method: "popup", minutes: 1440 },
      ],
    },
  };
  return upsertEvent(accessToken, body, policy.calendar_event_id);
}
