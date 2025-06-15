import fs from 'fs';
import path from 'path';
import fetchMock from 'jest-fetch-mock';
import { postToSlack } from '../../scripts/postToSlack';

fetchMock.enableMocks();

const origEnv = process.env;

describe('postToSlack script', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    process.env = { ...origEnv, SLACK_WEBHOOK_URL: 'https://example.com/webhook' };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it('posts metrics to slack', async () => {
    const tmp = fs.mkdtempSync(path.join(process.cwd(), 'metrics-'));
    const metrics = {
      medianCycleTimeHours: 5,
      p95PickupTimeHours: 10,
      largePrRatio: 0.2,
    };
    const file = path.join(tmp, 'm.json');
    fs.writeFileSync(file, JSON.stringify(metrics));

    await postToSlack(file);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('https://example.com/webhook');
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body).toEqual({
      blocks: [
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: '*Median cycle time\n5h' },
            { type: 'mrkdwn', text: '*p95 pickup time\n10h' },
            { type: 'mrkdwn', text: '*Large PR ratio\n20.0%' },
          ],
        },
      ],
    });

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
