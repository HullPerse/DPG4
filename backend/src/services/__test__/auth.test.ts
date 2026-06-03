import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";

describe("Password hashing", () => {
  test("hash and verify correct password", async () => {
    const hash = await Bun.password.hash("testPassword123!");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("testPassword123!");
    const valid = await Bun.password.verify("testPassword123!", hash);
    expect(valid).toBe(true);
  });

  test("verify wrong password fails", async () => {
    const hash = await Bun.password.hash("correct");
    const valid = await Bun.password.verify("wrong", hash);
    expect(valid).toBe(false);
  });

  test("different passwords produce different hashes", async () => {
    const hash1 = await Bun.password.hash("password1");
    const hash2 = await Bun.password.hash("password2");
    expect(hash1).not.toBe(hash2);
  });
});

describe("JWT", () => {
  const secret = "test-jwt-secret-for-testing";

  test("sign and verify token", async () => {
    const app = new Elysia().use(
      jwt({ name: "jwt", secret, exp: "1h" }),
    );

    let signedToken = "";
    let verifiedPayload: Record<string, unknown> | null = null;

    app.derive({ as: "global" }, ({ jwt }) => ({
      async sign(sub: string, isAdmin: boolean) {
        signedToken = await jwt.sign({ sub, isAdmin });
        return signedToken;
      },
      async verify(token: string) {
        verifiedPayload = await jwt.verify(token);
        return verifiedPayload;
      },
    }));

    const derived = await app
      .derive({ as: "global" }, ({ sign, verify }) => ({
        testSign: sign,
        testVerify: verify,
      }))
      .handle(new Request("http://localhost/"));

    await derived;
  });

  test("sign and verify with known secret", async () => {
    const app = new Elysia()
      .use(jwt({ name: "jwt", secret, exp: "1h" }))
      .get("/test", async ({ jwt }) => {
        const token = await jwt.sign({ sub: "user123", isAdmin: true });
        const payload = await jwt.verify(token);
        return { token, payload };
      });

    const res = await app.handle(
      new Request("http://localhost/test"),
    );
    const body = await res.json();
    expect(body.payload).not.toBeNull();
    expect(body.payload.sub).toBe("user123");
    expect(body.payload.isAdmin).toBe(true);
  });

  test("verify fake token returns false", async () => {
    const app = new Elysia()
      .use(jwt({ name: "jwt", secret, exp: "1h" }))
      .get("/test", async ({ jwt }) => {
        const payload = await jwt.verify("fake.token.here");
        return { payload };
      });

    const res = await app.handle(
      new Request("http://localhost/test"),
    );
    const body = await res.json();
    expect(body.payload).toBe(false);
  });

  test("token with different secret does not verify", async () => {
    const app = new Elysia()
      .use(jwt({ name: "jwt", secret, exp: "1h" }))
      .get("/sign", async ({ jwt }) => {
        const token = await jwt.sign({ sub: "user123" });
        return { token };
      })
      .get("/verify", async ({ jwt, query }) => {
        const payload = await jwt.verify(query.token as string);
        return { payload };
      });

    const signRes = await app.handle(
      new Request("http://localhost/sign"),
    );
    const { token } = await signRes.json();

    const wrongApp = new Elysia()
      .use(jwt({ name: "jwt", secret: "different-secret", exp: "1h" }))
      .get("/verify", async ({ jwt, query }) => {
        const payload = await jwt.verify(query.token as string);
        return { payload };
      });

    const verifyRes = await wrongApp.handle(
      new Request(`http://localhost/verify?token=${token}`),
    );
    const body = await verifyRes.json();
    expect(body.payload).toBe(false);
  });
});
