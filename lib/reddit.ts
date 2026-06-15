import { requireEnv } from "./env";

export type RedditPost = {
  externalId: string;
  url: string;
  title: string;
  body: string;
  author: string;
  subreddit: string;
  postedAt: string;
  score: number;
  commentCount: number;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const clientId = requireEnv("REDDIT_CLIENT_ID");
  const clientSecret = requireEnv("REDDIT_CLIENT_SECRET");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": requireEnv("REDDIT_USER_AGENT")
    },
    body: new URLSearchParams({ grant_type: "client_credentials" })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reddit token failed: ${response.status} ${text}`);
  }

  const json = await response.json();
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in || 3600) * 1000
  };
  return cachedToken.token;
}

export async function searchSubredditPosts(input: { subreddit: string; keywords: string[]; limit?: number }) {
  const token = await getAccessToken();
  const query = input.keywords.map((k) => `"${k.replaceAll('"', "").trim()}"`).join(" OR ");
  const safeSubreddit = input.subreddit.replace(/^r\//i, "").trim();
  const url = new URL(`https://oauth.reddit.com/r/${encodeURIComponent(safeSubreddit)}/search.json`);
  url.searchParams.set("q", query || "advice");
  url.searchParams.set("restrict_sr", "1");
  url.searchParams.set("sort", "new");
  url.searchParams.set("t", "week");
  url.searchParams.set("limit", String(input.limit || 25));

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": requireEnv("REDDIT_USER_AGENT")
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reddit search failed for r/${safeSubreddit}: ${response.status} ${text}`);
  }

  const json = await response.json();
  const posts: RedditPost[] = (json.data?.children || []).map((child: any) => {
    const data = child.data || {};
    return {
      externalId: data.name || data.id,
      url: `https://www.reddit.com${data.permalink || ""}`,
      title: data.title || "Untitled",
      body: data.selftext || "",
      author: data.author || "unknown",
      subreddit: data.subreddit_name_prefixed || `r/${safeSubreddit}`,
      postedAt: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : new Date().toISOString(),
      score: data.score || 0,
      commentCount: data.num_comments || 0
    };
  });

  return posts;
}
