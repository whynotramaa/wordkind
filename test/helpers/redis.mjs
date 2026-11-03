// A test-only Upstash REST fixture. Production never uses process memory for rooms.
export function startRedisFixture() {
  const data = new Map(),
    token = crypto.randomUUID();
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      if (req.headers.get("authorization") !== `Bearer ${token}`)
        return new Response("", { status: 401 });
      const args = await req.json(),
        [command, key, ...rest] = args;
      const get = (k) => {
        const value = data.get(k);
        if (value && value.expires <= Date.now()) {
          data.delete(k);
          return null;
        }
        return value?.value ?? null;
      };
      let result;
      if (command === "GET") result = get(key);
      else if (command === "SET") {
        if (rest.includes("NX") && get(key) !== null) result = null;
        else {
          const i = rest.indexOf("EX");
          data.set(key, {
            value: rest[0],
            expires:
              i >= 0 ? Date.now() + Number(rest[i + 1]) * 1000 : Infinity,
          });
          result = "OK";
        }
      } else if (command === "EVAL") {
        const roomKey = args[3],
          expected = args[4],
          next = args[5];
        if (!key.includes("'KEEPTTL'") || Number(args[2]) !== 1)
          return Response.json({ error: "Unexpected test command" });
        if (get(roomKey) !== expected) result = 0;
        else {
          data.set(roomKey, {
            value: next,
            expires: data.get(roomKey).expires,
          });
          result = 1;
        }
      } else return Response.json({ error: "Unsupported test command" });
      return Response.json({ result });
    },
  });
  return {
    url: `http://127.0.0.1:${server.port}`,
    token,
    stop: () => server.stop(true),
    data,
    room(code) {
      return JSON.parse(data.get(`wordkind:room:${code}`).value);
    },
    change(code, fn) {
      const entry = data.get(`wordkind:room:${code}`),
        room = JSON.parse(entry.value);
      fn(room);
      entry.value = JSON.stringify(room);
    },
  };
}
