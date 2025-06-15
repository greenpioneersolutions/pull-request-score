export interface GetAuthStrategyParams {
  owner: string;
  token: string;
  baseUrl?: string;
}

export type AuthStrategy = () => Promise<string>;


export function getAuthStrategy({
  owner,
  token,
  baseUrl,
}: GetAuthStrategyParams): AuthStrategy {
  const appId = process.env["GH_APP_ID"];
  const privateKey = process.env["GH_APP_PK"];

  if (appId && privateKey) {
    let auth: any;
    let request: any;
    let installationId: number | undefined;
    return async () => {
      if (!auth) {
        const mod = await import("@octokit/auth-app");
        const reqMod = await import("@octokit/request");
        request = reqMod.request.defaults({ baseUrl });
        auth = mod.createAppAuth({ appId, privateKey, request });
      }
      if (!installationId) {
        const { token: jwt } = await auth({ type: "app" });
        const reqWithJwt = request.defaults({
          headers: { authorization: `Bearer ${jwt}` },
        });
        const { data } = await reqWithJwt("GET /app/installations");
        const inst = (data as any[]).find(
          (i: any) => i.account?.login.toLowerCase() === owner.toLowerCase(),
        );
        if (!inst) throw new Error(`No installation for ${owner}`);
        installationId = inst.id;
      }
      const res = await auth({
        type: "installation",
        installationId: installationId!,
      });
      return res.token;
    };
  }

  return async () => token;
}
