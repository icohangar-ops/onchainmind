/**
 * OnchainMind — Sentiment Analysis Skill
 *
 * Social sentiment analysis, fear/greed index tracking, and news aggregation
 * for tokens on the Pharos network and beyond.
 *
 * Combines social signals (Twitter/X, Reddit, Telegram, News) with on-chain
 * data from PharosAdapter to produce composite sentiment scores.
 *
 * MCP Tools:
 * - sentiment_analyze: Get composite sentiment score for a token
 * - sentiment_fear_greed: Get the current Fear & Greed Index
 * - sentiment_aggregate_news: Aggregate recent crypto news with sentiment
 */

import type {
  Skill,
  SkillResult,
  SentimentScore,
  FearGreedIndex,
  NewsItem,
} from "../utils/types";
import { MemoryCache } from "../utils/cache";
import { withRetry } from "../utils/retry";
import { createLogger } from "../utils/logger";

const logger = createLogger("info", "SentimentSkill");
const sentimentCache = new MemoryCache<SentimentScore>(20_000);
const newsCache = new MemoryCache<NewsItem[]>(45_000);

// ─── Simulated Data Generators ────────────────────────────────────────────

/** Simulate fetching social mention counts and sentiment from various sources */
async function fetchSocialSignals(tokenAddress: string): Promise<{
  twitter: { mentions: number; sentiment: number };
  reddit: { mentions: number; sentiment: number };
  telegram: { mentions: number; sentiment: number };
  news: { mentions: number; sentiment: number };
  keywords: string[];
}> {
  return withRetry(async () => {
    const hash = tokenAddress.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const seed = hash % 1000 / 1000;

    const twitterMentions = Math.floor(50 + seed * 2000 + Math.random() * 500);
    const redditMentions = Math.floor(10 + seed * 300 + Math.random() * 100);
    const telegramMentions = Math.floor(20 + seed * 800 + Math.random() * 200);
    const newsMentions = Math.floor(5 + seed * 100 + Math.random() * 30);

    // Sentiment ranges: 0 (extremely negative) to 1 (extremely positive)
    const twitterSentiment = clampSentiment(0.3 + seed * 0.4 + (Math.random() - 0.5) * 0.2);
    const redditSentiment = clampSentiment(0.35 + seed * 0.35 + (Math.random() - 0.5) * 0.25);
    const telegramSentiment = clampSentiment(0.25 + seed * 0.5 + (Math.random() - 0.5) * 0.3);
    const newsSentiment = clampSentiment(0.4 + seed * 0.3 + (Math.random() - 0.5) * 0.15);

    const keywordPool = [
      "bullish", "breakout", "accumulation", "pump", "rally",
      "dump", "bearish", "overbought", "oversold", "consolidation",
      "whale alert", "listing", "partnership", "mainnet", "staking",
      "airdrop", "deflationary", "burn", "buyback", "upgrade",
    ];
    const numKeywords = 3 + Math.floor(Math.random() * 5);
    const keywords: string[] = [];
    for (let i = 0; i < numKeywords; i++) {
      keywords.push(keywordPool[(hash + i) % keywordPool.length]);
    }

    return {
      twitter: { mentions: twitterMentions, sentiment: twitterSentiment },
      reddit: { mentions: redditMentions, sentiment: redditSentiment },
      telegram: { mentions: telegramMentions, sentiment: telegramSentiment },
      news: { mentions: newsMentions, sentiment: newsSentiment },
      keywords,
    };
  });
}

/** Simulate fetching volume change and price momentum from PharosAdapter */
async function fetchOnChainCorrelation(tokenAddress: string): Promise<{
  volumeChange24h: number;
  priceMomentum: number;
  activeAddresses: number;
  largeTxCount: number;
}> {
  return withRetry(async () => {
    const hash = tokenAddress.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const seed = (hash * 7) % 1000 / 1000;

    return {
      volumeChange24h: (seed - 0.4) * 80,       // -40% to +40%
      priceMomentum: (seed - 0.45) * 20,         // -10% to +10%
      activeAddresses: Math.floor(200 + seed * 3000),
      largeTxCount: Math.floor(seed * 50),
    };
  });
}

/** Generate a simulated Fear & Greed Index */
async function fetchFearGreedIndex(): Promise<FearGreedIndex> {
  const cacheKey = "fear_greed_index";
  const cached = newsCache.get(cacheKey);
  if (cached) return cached as unknown as FearGreedIndex;

  return withRetry(async () => {
    const hourOfDay = new Date().getUTCHours();
    const daySeed = Math.floor(Date.now() / 86_400_000);
    const baseValue = ((daySeed * 17 + hourOfDay * 3) % 100);

    let value = baseValue + Math.floor((Math.random() - 0.5) * 10);
    value = Math.max(0, Math.min(100, value));

    const classification = classifyFearGreed(value);
    const result: FearGreedIndex = {
      value,
      classification,
      timestamp: Date.now(),
    };

    newsCache.set(cacheKey, result as unknown as NewsItem[], 60_000);
    return result;
  });
}

/** Generate simulated news items */
async function fetchCryptoNews(tokenAddress?: string): Promise<NewsItem[]> {
  const cacheKey = `news_${tokenAddress ?? "global"}`;
  const cached = newsCache.get(cacheKey) as NewsItem[] | undefined;
  if (cached) return cached;

  return withRetry(async () => {
    const headlines = [
      "Pharos Network Reaches Milestone in DeFi TVL Growth",
      "PROS Token Sees Unusual Whale Accumulation Pattern",
      "New Cross-Chain Bridge Integrates Pharos Ecosystem",
      "DeFi Protocol on Pharos Introduces Novel Yield Mechanism",
      "Market Analysis: Pharos Among Top Emerging L1 Chains",
      "Institutional Interest Growing in Pharos DeFi Ecosystem",
      "Pharos Testnet Activity Surges Ahead of Mainnet Launch",
      "Security Audit Completed for Major Pharos Protocol",
      "PROS Staking Rate Hits Record High",
      "Pharos Developer Activity Up 40% Month-over-Month",
    ];

    const sources = ["CoinDesk", "The Block", "DeFi Llama", "Pharos Blog", "CoinTelegraph", "Decrypt"];
    const numArticles = 5 + Math.floor(Math.random() * 6);
    const items: NewsItem[] = [];

    for (let i = 0; i < numArticles; i++) {
      const sentiment = clampSentiment(0.3 + Math.random() * 0.4);
      items.push({
        title: headlines[i % headlines.length],
        source: sources[i % sources.length],
        url: `https://example.com/news/${Date.now()}-${i}`,
        publishedAt: Date.now() - i * 3600_000,
        sentiment: Math.round(sentiment * 100),
        tokensMentioned: tokenAddress
          ? [tokenAddress, "PROS"]
          : ["PROS", "USDT", "WETH"],
      });
    }

    newsCache.set(cacheKey, items, 45_000);
    return items;
  });
}

// ─── Sentiment Calculation ────────────────────────────────────────────────

/** Combine social signals + on-chain data into a weighted composite score */
function calculateCompositeSentiment(
  social: Awaited<ReturnType<typeof fetchSocialSignals>>,
  onChain: Awaited<ReturnType<typeof fetchOnChainCorrelation>>,
  tokenAddress: string
): SentimentScore {
  // Source weights for composite score
  const weights = {
    twitter: 0.25,
    reddit: 0.15,
    telegram: 0.15,
    news: 0.15,
    volumeMomentum: 0.15,
    priceMomentum: 0.10,
    whaleActivity: 0.05,
  };

  // Normalize on-chain signals to 0-1 range
  const volumeSentiment = clampSentiment(0.5 + (onChain.volumeChange24h / 80) * 0.5);
  const priceSentiment = clampSentiment(0.5 + (onChain.priceMomentum / 20) * 0.5);
  const whaleSentiment = clampSentiment(
    onChain.largeTxCount > 20 ? 0.7 + (onChain.largeTxCount / 50) * 0.3 : 0.3
  );

  // Weighted composite
  const composite =
    social.twitter.sentiment * weights.twitter +
    social.reddit.sentiment * weights.reddit +
    social.telegram.sentiment * weights.telegram +
    social.news.sentiment * weights.news +
    volumeSentiment * weights.volumeMomentum +
    priceSentiment * weights.priceMomentum +
    whaleSentiment * weights.whaleActivity;

  const totalMentions =
    social.twitter.mentions +
    social.reddit.mentions +
    social.telegram.mentions +
    social.news.mentions;

  const trending = totalMentions > 2000;

  return {
    token: tokenAddress,
    overall: Math.round(composite * 100),
    twitter: Math.round(social.twitter.sentiment * 100),
    reddit: Math.round(social.reddit.sentiment * 100),
    telegram: Math.round(social.telegram.sentiment * 100),
    news: Math.round(social.news.sentiment * 100),
    mentionCount: totalMentions,
    trending,
    keywords: social.keywords,
  };
}

function clampSentiment(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function classifyFearGreed(value: number): FearGreedIndex["classification"] {
  if (value <= 20) return "Extreme Fear";
  if (value <= 40) return "Fear";
  if (value <= 60) return "Neutral";
  if (value <= 80) return "Greed";
  return "Extreme Greed";
}

function sentimentLabel(score: number): string {
  if (score <= 25) return "Extremely Bearish";
  if (score <= 40) return "Bearish";
  if (score <= 60) return "Neutral";
  if (score <= 75) return "Bullish";
  return "Extremely Bullish";
}

// ─── Skill Implementation ─────────────────────────────────────────────────

export const SentimentSkill: Skill = {
  name: "sentiment",
  description:
    "Social sentiment analysis, fear/greed index tracking, and news aggregation for Pharos tokens. Combines social signals with on-chain data for composite sentiment scoring.",
  version: "1.0.0",

  tools: [
    {
      name: "analyze_sentiment",
      description: "Get a composite sentiment score for a token by analyzing social signals (Twitter/X, Reddit, Telegram, News) and correlating with on-chain volume/price momentum.",
      inputSchema: {
        type: "object",
        properties: {
          tokenAddress: { type: "string", description: "The token contract address to analyze sentiment for" },
          timeframe: { type: "string", enum: ["1h", "6h", "24h", "7d"], description: "Analysis timeframe (default: 24h)" },
        },
        required: ["tokenAddress"],
      },
    },
    {
      name: "get_fear_greed",
      description: "Get the current Fear & Greed Index for the broader crypto market. Useful for context before making investment decisions.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "aggregate_news",
      description: "Aggregate recent crypto news articles relevant to a token or the broader market, with per-article sentiment scoring.",
      inputSchema: {
        type: "object",
        properties: {
          tokenAddress: { type: "string", description: "Token address to filter news (optional, returns general news if omitted)" },
          maxArticles: { type: "number", description: "Maximum number of articles to return (default: 10)" },
        },
      },
    },
  ],

  async execute(toolName: string, input: Record<string, unknown>): Promise<SkillResult> {
    const startTime = Date.now();

    try {
      switch (toolName) {
        case "analyze_sentiment": {
          const tokenAddress = input.tokenAddress as string;
          if (!tokenAddress) {
            return {
              success: false,
              data: {},
              error: "tokenAddress is required",
              executionTimeMs: Date.now() - startTime,
              skillName: "sentiment",
              toolName,
            };
          }

          const cacheKey = `sentiment_${tokenAddress}`;
          const cached = sentimentCache.get(cacheKey) as SentimentScore | undefined;
          if (cached) {
            return {
              success: true,
              data: {
                ...cached,
                label: sentimentLabel(cached.overall),
                timeframe: (input.timeframe as string) ?? "24h",
                cached: true,
                fetchedAt: new Date().toISOString(),
              },
              executionTimeMs: Date.now() - startTime,
              skillName: "sentiment",
              toolName,
            };
          }

          // Fetch signals in parallel
          const [social, onChain] = await Promise.all([
            fetchSocialSignals(tokenAddress),
            fetchOnChainCorrelation(tokenAddress),
          ]);

          const sentiment = calculateCompositeSentiment(social, onChain, tokenAddress);
          sentimentCache.set(cacheKey, sentiment);

          return {
            success: true,
            data: {
              ...sentiment,
              label: sentimentLabel(sentiment.overall),
              timeframe: (input.timeframe as string) ?? "24h",
              cached: false,
              fetchedAt: new Date().toISOString(),
              breakdown: {
                socialSources: {
                  twitter: `${social.twitter.mentions} mentions`,
                  reddit: `${social.reddit.mentions} mentions`,
                  telegram: `${social.telegram.mentions} mentions`,
                  news: `${social.news.mentions} mentions`,
                },
                onChainSignals: {
                  volumeChange24h: `${onChain.volumeChange24h.toFixed(1)}%`,
                  priceMomentum: `${onChain.priceMomentum.toFixed(1)}%`,
                  activeAddresses: onChain.activeAddresses,
                  largeTransactions: onChain.largeTxCount,
                },
              },
            },
            executionTimeMs: Date.now() - startTime,
            skillName: "sentiment",
            toolName,
          };
        }

        case "get_fear_greed": {
          const fearGreed = await fetchFearGreedIndex();

          return {
            success: true,
            data: {
              ...fearGreed,
              formattedTime: new Date(fearGreed.timestamp).toISOString(),
              recommendation: fearGreed.value <= 25
                ? "Extreme fear often signals buying opportunities for long-term holders."
                : fearGreed.value <= 40
                  ? "Fear in the market — consider dollar-cost averaging into positions."
                  : fearGreed.value <= 60
                    ? "Neutral market sentiment — no strong directional bias."
                    : fearGreed.value <= 80
                      ? "Greed in the market — exercise caution, consider taking some profits."
                      : "Extreme greed — high risk of correction. Consider reducing exposure.",
            },
            executionTimeMs: Date.now() - startTime,
            skillName: "sentiment",
            toolName,
          };
        }

        case "aggregate_news": {
          const tokenAddress = input.tokenAddress as string | undefined;
          const maxArticles = Math.min((input.maxArticles as number) ?? 10, 50);

          const news = await fetchCryptoNews(tokenAddress);
          const articles = news.slice(0, maxArticles);

          const avgSentiment = articles.length > 0
            ? Math.round(articles.reduce((s, a) => s + a.sentiment, 0) / articles.length)
            : 50;

          const positiveCount = articles.filter((a) => a.sentiment > 60).length;
          const negativeCount = articles.filter((a) => a.sentiment < 40).length;

          return {
            success: true,
            data: {
              tokenFilter: tokenAddress ?? "global",
              articles,
              summary: {
                totalArticles: articles.length,
                averageSentiment: avgSentiment,
                sentimentLabel: sentimentLabel(avgSentiment),
                positiveArticles: positiveCount,
                negativeArticles: negativeCount,
                neutralArticles: articles.length - positiveCount - negativeCount,
              },
              topMentionedTokens: [...new Set(articles.flatMap((a) => a.tokensMentioned))].slice(0, 10),
              fetchedAt: new Date().toISOString(),
            },
            executionTimeMs: Date.now() - startTime,
            skillName: "sentiment",
            toolName,
          };
        }

        default:
          return {
            success: false,
            data: {},
            error: `Unknown tool: ${toolName}. Available: ${["analyze_sentiment", "get_fear_greed", "aggregate_news"].join(", ")}`,
            executionTimeMs: Date.now() - startTime,
            skillName: "sentiment",
            toolName,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Sentiment analysis failed: ${errorMessage}`);
      return {
        success: false,
        data: {},
        error: errorMessage,
        executionTimeMs: Date.now() - startTime,
        skillName: "sentiment",
        toolName,
      };
    }
  },
};
