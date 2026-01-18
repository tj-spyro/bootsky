export interface FollowedProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  postsCount: number;
  followersCount: number;
  followsCount: number;
}

export interface ProfileWithStats extends FollowedProfile {
  originalPostsCount: number;
  mediaPostsCount: number;
  hasAvatar: boolean;
}

export interface FilterState {
  noAvatar: boolean;
  minOriginalPosts: number;
  minMediaPosts: number;
}
