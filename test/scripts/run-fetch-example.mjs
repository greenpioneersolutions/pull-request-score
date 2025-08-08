import nock from "nock";
import { fetchMetrics } from "../../playground/fetch-metrics.mjs";

process.env.GH_TOKEN = "token";

nock("https://api.github.com")
  .post("/graphql")
  .reply(200, {
    data: {
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [],
        },
      },
    },
  });

fetchMetrics("owner/repo")
  .then((m) => {
    console.log(JSON.stringify(m));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
