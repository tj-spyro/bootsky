import { agent } from "./api";
import { getCached, setCached } from "./cache";
import {
  AppBskyActorDefs,
  AppBskyFeedDefs,
  AppBskyEmbedImages,
  AppBskyEmbedVideo,
  AppBskyEmbedRecordWithMedia
} from "@atproto/api";

export interface ProfileWithStats extends AppBskyActorDefs.ProfileViewDetailed {
  originalPostsCount: number;
  mediaPostsCount: number;
  hasAvatar: boolean;
}

const chunkArray = <T>(arr: T[], chunkSize: number): T[][] => {
  return arr.reduce((acc, cur, i) => {
    const chunkIndex = Math.floor(i / chunkSize)
    if (!acc[chunkIndex]) {
      acc[chunkIndex] = []
    }
    acc[chunkIndex].push(cur)
    return acc
  }, [] as T[][])
}

/**
 * Fetch all follows (following) for a given actor with pagination
 */
export async function getAllFollows(agentInstance: typeof agent, actor: string): Promise<AppBskyActorDefs.ProfileView[]> {
  // Check cache first
  const cached = getCached<AppBskyActorDefs.ProfileView[]>(actor, "following");
  if (cached) {
    return cached;
  }

  const follows: AppBskyActorDefs.ProfileView[] = [];
  let cursor: string | undefined = undefined;

  try {
    do {
      const response = await agentInstance.app.bsky.graph.getFollows({
        actor,
        limit: 100,
        cursor,
      });

      follows.push(...response.data.follows);
      cursor = response.data.cursor;
    } while (cursor);

    // Cache the results
    setCached(actor, "following", follows);

    return follows;
  } catch (error) {
    console.error(`Error fetching follows for ${actor}:`, error);
    throw new Error(`Failed to fetch follows for ${actor}`);
  }
}

export async function getDetailedFollows(agentInstance: typeof agent, basicFollows: AppBskyActorDefs.ProfileView[]): Promise<AppBskyActorDefs.ProfileViewDetailed[]> {
  const detailedFollows: AppBskyActorDefs.ProfileViewDetailed[] = [];

  const allDids = basicFollows.map(follow => follow.did);
  const uncachedDids: string[] = [];

  for (const did of allDids) {
    const cached = getCached<AppBskyActorDefs.ProfileViewDetailed>(did, "profile");
    if (cached) {
      detailedFollows.push(cached);
    }
    else {
      uncachedDids.push(did);
    }
  }

  for (const actors of chunkArray(uncachedDids, 25)) {
    try {
      const response = await agentInstance.app.bsky.actor.getProfiles({
        actors,
      });

      for (const profile of response.data.profiles) {
        detailedFollows.push(profile);
        setCached(profile.did, "profile", profile);
      }
    } catch (error) {
      console.error(`Error fetching detailed profiles:`, error);
      throw new Error(`Failed to fetch detailed profiles`);
    }
  }
  return detailedFollows;
}

async function analyzeProfile(agentInstance: typeof agent, profile: AppBskyActorDefs.ProfileViewDetailed): Promise<ProfileWithStats> {
  const feedResults: AppBskyFeedDefs.FeedViewPost[] = [];
  let cursor: string | undefined = undefined;

  try {
    do {
      const response = await agentInstance.app.bsky.feed.getAuthorFeed({
        actor: profile.did,
        limit: 100,
        cursor,
      });

      feedResults.push(...response.data.feed);
      cursor = response.data.cursor;
    } while (cursor);

    const originalPostsCount = feedResults.filter(
      (post) => !AppBskyFeedDefs.isReasonRepost(post.reason)
    ).length;

    const mediaPostsCount = feedResults.filter(
      (post) => {
        if (post.post.embed === undefined) {
          return false;
        }
        const embed = post.post.embed;
        return AppBskyEmbedImages.isView(embed) || AppBskyEmbedVideo.isView(embed) || AppBskyEmbedRecordWithMedia.isView(embed);
      }
    ).length;

    const hasAvatar = profile.avatar !== undefined && profile.avatar !== null;

    const analyzedProfile: ProfileWithStats = {
      ...profile,
      originalPostsCount,
      mediaPostsCount,
      hasAvatar,
    };

    return analyzedProfile;
  } catch (error) {
    console.error(`Error analyzing profile for ${profile.did}:`, error);
    throw new Error(`Failed to analyze profile for ${profile.did}`);
  }
}

export async function analyzeProfiles(agentInstance: typeof agent, profiles: AppBskyActorDefs.ProfileViewDetailed[]): Promise<ProfileWithStats[]> {
  const analyzedProfiles: ProfileWithStats[] = [];

  const allDids = profiles.map(profile => profile.did);
  const uncachedDids: string[] = [];

  for (const did of allDids) {
    const cached = getCached<ProfileWithStats>(did, "profile-stats");
    if (cached) {
      analyzedProfiles.push(cached);
    }
    else {
      uncachedDids.push(did);
    }
  }

  const uncachedProfiles = profiles.filter(profile => uncachedDids.includes(profile.did));

  for (const batch of chunkArray(uncachedProfiles, 5)) {
    const analyzedBatch = await Promise.allSettled(
      batch.map(async (profile) => {
        const analyzedProfile = await analyzeProfile(agentInstance, profile);
        setCached(profile.did, "profile-stats", analyzedProfile);
        return analyzedProfile;
      })
    );

    // Only add successfully analyzed profiles
    for (let i = 0; i < analyzedBatch.length; i++) {
      const result = analyzedBatch[i];
      if (result.status === 'fulfilled') {
        analyzedProfiles.push(result.value);
      } else {
        console.error(`Failed to analyze profile ${batch[i].did}:`, result.reason);
      }
    }
  }

  return analyzedProfiles;
}
