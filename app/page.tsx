'use client';

import { AtpAgent } from '@atproto/api';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ProfileWithStats, FilterState } from './types';

export default function Home() {
  const [agent] = useState(() => new AtpAgent({ service: 'https://bsky.social' }));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<ProfileWithStats[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileWithStats[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    noAvatar: false,
    minOriginalPosts: 0,
    minMediaPosts: 0,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await agent.login({
        identifier: handle,
        password: password,
      });
      setIsAuthenticated(true);
      setPassword(''); // Clear password after successful login
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFollows = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const follows = await agent.getFollows({ actor: agent.session?.did || '' });
      
      // Fetch detailed stats for each profile
      const profilesWithStats = await Promise.all(
        follows.data.follows.map(async (follow) => {
          try {
            // Fetch author feed to get post stats
            const feed = await agent.getAuthorFeed({
              actor: follow.did,
              limit: 100,
            });

            let originalPostsCount = 0;
            let mediaPostsCount = 0;

            feed.data.feed.forEach((item) => {
              const post = item.post;
              const isRepost = item.reason?.$type === 'app.bsky.feed.defs#reasonRepost';
              const isReply = post.record && 'reply' in post.record;

              // Count original posts (not reposts or replies)
              if (!isRepost && !isReply) {
                originalPostsCount++;

                // Check if post has media (images or videos)
                const embed = post.embed;
                if (embed) {
                  const embedType = embed.$type;
                  if (
                    embedType === 'app.bsky.embed.images#view' ||
                    embedType === 'app.bsky.embed.video#view' ||
                    (embedType === 'app.bsky.embed.recordWithMedia#view' && 'media' in embed)
                  ) {
                    mediaPostsCount++;
                  }
                }
              }
            });

            return {
              did: follow.did,
              handle: follow.handle,
              displayName: follow.displayName,
              avatar: follow.avatar,
              description: follow.description,
              postsCount: 0, // Not directly available from API
              followersCount: 0,
              followsCount: 0,
              originalPostsCount,
              mediaPostsCount,
              hasAvatar: !!follow.avatar,
            };
          } catch (err) {
            console.error(`Error fetching stats for ${follow.handle}:`, err);
            return {
              did: follow.did,
              handle: follow.handle,
              displayName: follow.displayName,
              avatar: follow.avatar,
              description: follow.description,
              postsCount: 0,
              followersCount: 0,
              followsCount: 0,
              originalPostsCount: 0,
              mediaPostsCount: 0,
              hasAvatar: !!follow.avatar,
            };
          }
        })
      );

      setProfiles(profilesWithStats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch follows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFollows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    // Apply filters
    let filtered = profiles;

    if (filters.noAvatar) {
      filtered = filtered.filter(p => !p.hasAvatar);
    }

    if (filters.minOriginalPosts > 0) {
      filtered = filtered.filter(p => p.originalPostsCount >= filters.minOriginalPosts);
    }

    if (filters.minMediaPosts > 0) {
      filtered = filtered.filter(p => p.mediaPostsCount >= filters.minMediaPosts);
    }

    setFilteredProfiles(filtered);
  }, [profiles, filters]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setHandle('');
    setProfiles([]);
    setFilteredProfiles([]);
    setFilters({
      noAvatar: false,
      minOriginalPosts: 0,
      minMediaPosts: 0,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Bootsky</h1>
          <p className="text-gray-600 mb-6 text-center">Manage your Bluesky follows</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-gray-700 mb-1">
                Handle or Email
              </label>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="your-handle.bsky.social"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                App Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Generate an app password in your Bluesky settings
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Bootsky</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <input
                id="noAvatar"
                type="checkbox"
                checked={filters.noAvatar}
                onChange={(e) => setFilters({ ...filters, noAvatar: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="noAvatar" className="ml-2 text-sm text-gray-700">
                No Avatar
              </label>
            </div>

            <div>
              <label htmlFor="minOriginalPosts" className="block text-sm font-medium text-gray-700 mb-1">
                Min Original Posts
              </label>
              <input
                id="minOriginalPosts"
                type="number"
                min="0"
                value={filters.minOriginalPosts}
                onChange={(e) => setFilters({ ...filters, minOriginalPosts: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label htmlFor="minMediaPosts" className="block text-sm font-medium text-gray-700 mb-1">
                Min Media Posts
              </label>
              <input
                id="minMediaPosts"
                type="number"
                min="0"
                value={filters.minMediaPosts}
                onChange={(e) => setFilters({ ...filters, minMediaPosts: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Following ({filteredProfiles.length} of {profiles.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading follows...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              {profiles.length === 0 ? 'No follows found' : 'No profiles match the selected filters'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredProfiles.map((profile) => (
                <div key={profile.did} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {profile.avatar ? (
                      <Image
                        src={profile.avatar}
                        alt={profile.displayName || profile.handle}
                        className="w-12 h-12 rounded-full"
                        width={48}
                        height={48}
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900">
                        {profile.displayName || profile.handle}
                      </h3>
                      <p className="text-sm text-gray-600">@{profile.handle}</p>
                      {profile.description && (
                        <p className="mt-1 text-sm text-gray-700 line-clamp-2">
                          {profile.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          {profile.originalPostsCount} original
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {profile.mediaPostsCount} media
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
