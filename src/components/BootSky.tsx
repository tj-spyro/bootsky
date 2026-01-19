'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  analyzeProfiles,
  getAllFollows,
  getDetailedFollows,
  ProfileWithStats
} from '../lib/bluesky';
import { agent } from '../lib/api';

interface FilterState {
  noAvatar: boolean;
  minOriginalPosts?: number;
  maxOriginalPosts?: number;
  minMediaPosts?: number;
  maxMediaPosts?: number;
}

export default function BootSky() {
  const [agentInstance] = useState(agent);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<ProfileWithStats[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileWithStats[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    noAvatar: false,
    minOriginalPosts: undefined,
    maxOriginalPosts: undefined,
    minMediaPosts: undefined,
    maxMediaPosts: undefined,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await agentInstance.login({
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

  const fetchFollows = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const follows = await getAllFollows(agentInstance, agentInstance.session?.did || '');
      const detailedProfiles = await getDetailedFollows(agentInstance, follows);
      const profilesWithStats = await analyzeProfiles(agentInstance, detailedProfiles);
      setProfiles(profilesWithStats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch follows');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, agentInstance]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFollows();
    }
  }, [isAuthenticated, fetchFollows]);

  useEffect(() => {
    // Apply filters
    let filtered = profiles;

    if (filters.noAvatar) {
      filtered = filtered.filter(p => !p.hasAvatar);
    }

    if (filters.minOriginalPosts !== undefined) {
      filtered = filtered.filter(p => p.originalPostsCount >= filters.minOriginalPosts!);
    }

    if (filters.maxOriginalPosts !== undefined) {
      filtered = filtered.filter(p => p.originalPostsCount <= filters.maxOriginalPosts!);
    }

    if (filters.minMediaPosts !== undefined) {
      filtered = filtered.filter(p => p.mediaPostsCount >= filters.minMediaPosts!);
    }

    if (filters.maxMediaPosts !== undefined) {
      filtered = filtered.filter(p => p.mediaPostsCount <= filters.maxMediaPosts!);
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
      minOriginalPosts: undefined,
      maxOriginalPosts: undefined,
      minMediaPosts: undefined,
      maxMediaPosts: undefined,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
          <h1 className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2 text-center">Bootsky</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 text-center">Manage your Bluesky follows</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Handle or Email
              </label>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="your-handle.bsky.social"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                App Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Generate an app password in your Bluesky settings
              </p>
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center py-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <h1 className="text-5xl font-bold text-blue-600 dark:text-blue-400">Bootsky</h1>
            <div className="flex-1 flex justify-end">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Manage your Bluesky follows with powerful filters
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-6 py-4 rounded-lg mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Error</h3>
                <p className="text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="ml-3 text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
                aria-label="Dismiss error"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <input
                id="noAvatar"
                type="checkbox"
                checked={filters.noAvatar}
                onChange={(e) => setFilters({ ...filters, noAvatar: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="noAvatar" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                No Avatar
              </label>
            </div>

            <div>
              <label htmlFor="minOriginalPosts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Original Posts
              </label>
              <input
                id="minOriginalPosts"
                type="number"
                min="0"
                value={filters.minOriginalPosts}
                onChange={(e) => setFilters({ ...filters, minOriginalPosts: Number.parseInt(e.target.value) || undefined })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>

            <div>
              <label htmlFor="maxOriginalPosts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Original Posts
              </label>
              <input
                id="maxOriginalPosts"
                type="number"
                min="0"
                value={filters.maxOriginalPosts}
                onChange={(e) => setFilters({ ...filters, maxOriginalPosts: Number.parseInt(e.target.value) || undefined })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>

            <div>
              <label htmlFor="minMediaPosts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Media Posts
              </label>
              <input
                id="minMediaPosts"
                type="number"
                min="0"
                value={filters.minMediaPosts}
                onChange={(e) => setFilters({ ...filters, minMediaPosts: Number.parseInt(e.target.value) || undefined })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>

            <div>
              <label htmlFor="maxMediaPosts" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Media Posts
              </label>
              <input
                id="maxMediaPosts"
                type="number"
                min="0"
                value={filters.maxMediaPosts}
                onChange={(e) => setFilters({ ...filters, maxMediaPosts: Number.parseInt(e.target.value) || undefined })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Following ({filteredProfiles.length} of {profiles.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-700 dark:text-gray-300">Loading follows...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-8 text-center text-gray-700 dark:text-gray-300">
              {profiles.length === 0 ? 'No follows found' : 'No profiles match the selected filters'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProfiles.map((profile) => (
                <div key={profile.did} className="p-6 hover:bg-blue-50 dark:hover:bg-gray-700 transition">
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
                      <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-600 dark:text-gray-300"
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
                      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        {profile.displayName || profile.handle}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">@{profile.handle}</p>
                      {profile.description && (
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          {profile.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-300">
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
      </div>
    </div>
  );
}
