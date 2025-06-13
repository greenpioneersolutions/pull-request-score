import Bottleneck from 'bottleneck';
import { createRateLimiter } from '../src/api/rateLimiter';

jest.mock('bottleneck', () => {
  const Mock = jest.fn().mockImplementation(function (this: any, opts: any) {
    this.opts = opts;
    this.schedule = jest.fn(async (fn: any, ...args: any[]) => fn(...args));
  });
  return { __esModule: true, default: Mock };
});

describe('createRateLimiter', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('schedules functions through Bottleneck', async () => {
    const limit = createRateLimiter({ requestsPerMinute: 10 });
    const BottleneckMock = Bottleneck as unknown as jest.MockedClass<any>;
    const instance = BottleneckMock.mock.instances[0];

    const result = await limit(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(instance.schedule).toHaveBeenCalledTimes(1);
    expect(instance.opts.reservoir).toBe(10);
  });

  it('uses the default GitHub rate when no options are given', async () => {
    const limit = createRateLimiter();
    const BottleneckMock = Bottleneck as unknown as jest.MockedClass<any>;
    const instance = BottleneckMock.mock.instances[0];

    await limit(() => Promise.resolve());
    expect(instance.opts.reservoir).toBeCloseTo(5000 / 60);
  });

  it('queues multiple tasks', async () => {
    const limit = createRateLimiter({ requestsPerMinute: 2 });
    const BottleneckMock = Bottleneck as unknown as jest.MockedClass<any>;
    const instance = BottleneckMock.mock.instances[0];

    await limit(() => Promise.resolve('a'));
    await limit(() => Promise.resolve('b'));

    expect(instance.schedule).toHaveBeenCalledTimes(2);
  });
});
