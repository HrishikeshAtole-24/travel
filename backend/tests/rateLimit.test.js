const { createRateLimiter } = require('../src/middleware/rateLimit.middleware');

function run(limiter, ip) {
  const res = { headers: {}, set(k, v) { this.headers[k] = v; } };
  let error;
  limiter({ ip }, res, (err) => { error = err; });
  return { res, error };
}

describe('createRateLimiter', () => {
  it('allows up to max requests then returns 429', () => {
    const limiter = createRateLimiter({ name: 'test', windowMs: 60000, max: 3 });

    for (let i = 0; i < 3; i++) {
      expect(run(limiter, '1.1.1.1').error).toBeUndefined();
    }

    const { error, res } = run(limiter, '1.1.1.1');
    expect(error.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBeDefined();
  });

  it('tracks clients independently', () => {
    const limiter = createRateLimiter({ name: 'test2', windowMs: 60000, max: 1 });
    expect(run(limiter, '1.1.1.1').error).toBeUndefined();
    expect(run(limiter, '2.2.2.2').error).toBeUndefined();
    expect(run(limiter, '1.1.1.1').error.statusCode).toBe(429);
  });
});
