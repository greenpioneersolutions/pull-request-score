import fs from 'fs';

export async function postToSlack(metricsPath = './metrics.json') {
  const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

  const medianCycleTimeHours = data.medianCycleTimeHours;
  const p95PickupTimeHours = data.p95PickupTimeHours;
  const largePrRatio = data.largePrRatio;

  const blocks = [
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Median cycle time\n${medianCycleTimeHours}h` },
        { type: 'mrkdwn', text: `*p95 pickup time\n${p95PickupTimeHours}h` },
        { type: 'mrkdwn', text: `*Large PR ratio\n${(largePrRatio * 100).toFixed(1)}%` },
      ],
    },
  ];

  const webhook = process.env['SLACK_WEBHOOK_URL'];
  if (!webhook) {
    console.error('SLACK_WEBHOOK_URL not set');
    return false;
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
    if (!res.ok) {
      console.error(`Slack POST failed: ${res.status}`);
      return false;
    }
    console.log('Posted to Slack');
    return true;
  } catch (err) {
    console.error(`Slack POST failed: ${(err as Error).message}`);
    return false;
  }
}

export default postToSlack;

if (process.argv[1] && process.argv[1].endsWith('postToSlack.js')) {
  postToSlack(process.argv[2]).then((ok) => process.exit(ok ? 0 : 1));
}
