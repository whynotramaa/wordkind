const compareAndSet = `
if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2],'KEEPTTL')
return 1`;
export function redisRoomStore() {
  const url = process.env.UPSTASH_REDIS_REST_URL,
    token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token)
    throw Object.assign(
      Error("Friend matches are temporarily unavailable. Solo play is ready."),
      { status: 503 },
    );
  async function command(args) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      throw Object.assign(
        Error("Room service is unavailable. Try reconnecting."),
        { status: 503 },
      );
    const payload = await response.json();
    if (payload.error)
      throw Object.assign(
        Error("Room service could not save this update. Try again."),
        { status: 503 },
      );
    return payload.result;
  }
  return {
    async create(code, room) {
      return (
        (await command([
          "SET",
          `wordkind:room:${code}`,
          JSON.stringify(room),
          "NX",
          "EX",
          7200,
        ])) === "OK"
      );
    },
    async read(code) {
      return await command(["GET", `wordkind:room:${code}`]);
    },
    async replace(code, old, room) {
      return (
        Number(
          await command([
            "EVAL",
            compareAndSet,
            1,
            `wordkind:room:${code}`,
            old,
            JSON.stringify(room),
          ]),
        ) === 1
      );
    },
  };
}
