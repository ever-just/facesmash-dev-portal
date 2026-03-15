import 'dotenv/config';

interface ResendDomainRecord {
  record: 'SPF' | 'DKIM' | 'MX';
  name: string;
  type: 'TXT' | 'MX' | 'CNAME';
  value: string;
  ttl: string;
  priority?: number;
}

interface ResendDomainResponse {
  name: string;
  records: ResendDomainRecord[];
}

interface GoDaddyRecord {
  type: string;
  name: string;
  data: string;
  ttl: number;
  priority?: number;
}

const {
  RESEND_API_KEY,
  RESEND_DOMAIN_ID,
  GODADDY_API_KEY,
  GODADDY_API_SECRET,
  GODADDY_DOMAIN,
  ROOT_SPF_VALUE,
  DMARC_VALUE,
  DMARC_REPORT_EMAIL,
} = process.env;

const DEFAULT_TTL = Number(process.env.DNS_TTL ?? '600');

function assertEnv(value: string | undefined, key: string): asserts value {
  if (!value) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

async function fetchResendRecords(): Promise<ResendDomainResponse> {
  assertEnv(RESEND_API_KEY, 'RESEND_API_KEY');
  assertEnv(RESEND_DOMAIN_ID, 'RESEND_DOMAIN_ID');

  const response = await fetch(`https://api.resend.com/domains/${RESEND_DOMAIN_ID}`, {
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch Resend domain: ${response.status} ${response.statusText} — ${body}`);
  }

  return (await response.json()) as ResendDomainResponse;
}

function stripQuotes(value: string): string {
  return value.replace(/^"|"$/g, '');
}

function buildDesiredRecords(resend: ResendDomainResponse): GoDaddyRecord[] {
  const records: GoDaddyRecord[] = [];

  resend.records
    .filter((record) => record.record === 'SPF' || record.record === 'DKIM')
    .forEach((record) => {
      records.push({
        type: record.type,
        name: record.name,
        data: stripQuotes(record.value),
        ttl: DEFAULT_TTL,
        ...(record.priority !== undefined ? { priority: record.priority } : {}),
      });
    });

  if (ROOT_SPF_VALUE) {
    records.push({
      type: 'TXT',
      name: '@',
      data: ROOT_SPF_VALUE,
      ttl: DEFAULT_TTL,
    });
  }

  const dmarcValue = DMARC_VALUE ?? `v=DMARC1; p=quarantine; pct=100; rua=mailto:${DMARC_REPORT_EMAIL ?? `dmarc@${resend.name}`}`;
  records.push({
    type: 'TXT',
    name: '_dmarc',
    data: dmarcValue,
    ttl: DEFAULT_TTL,
  });

  return records;
}

function groupRecords(records: GoDaddyRecord[]): Map<string, GoDaddyRecord[]> {
  const grouped = new Map<string, GoDaddyRecord[]>();

  for (const record of records) {
    const key = `${record.type}|${record.name}`;
    const list = grouped.get(key) ?? [];
    list.push(record);
    grouped.set(key, list);
  }

  return grouped;
}

async function upsertGoDaddyRecords(records: Map<string, GoDaddyRecord[]>): Promise<void> {
  assertEnv(GODADDY_API_KEY, 'GODADDY_API_KEY');
  assertEnv(GODADDY_API_SECRET, 'GODADDY_API_SECRET');
  assertEnv(GODADDY_DOMAIN, 'GODADDY_DOMAIN');

  for (const [key, list] of records.entries()) {
    const [type, name] = key.split('|');
    const url = `https://api.godaddy.com/v1/domains/${GODADDY_DOMAIN}/records/${type}/${encodeURIComponent(name)}`;

    const body = list.map(({ data, ttl, priority }) => ({
      data,
      ttl,
      ...(priority !== undefined ? { priority } : {}),
    }));

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to update ${type} ${name}: ${response.status} ${response.statusText} — ${errorBody}`);
    }

    console.log(`✔ Updated ${type} ${name}`);
  }
}

async function main() {
  try {
    const resendDomain = await fetchResendRecords();
    console.log(`Fetched Resend domain records for ${resendDomain.name}`);

    const desiredRecords = buildDesiredRecords(resendDomain);
    const grouped = groupRecords(desiredRecords);

    await upsertGoDaddyRecords(grouped);
    console.log('All DNS records updated successfully. Propagation can take up to 48 hours.');
  } catch (error) {
    console.error('DNS sync failed:', error);
    process.exitCode = 1;
  }
}

main();
