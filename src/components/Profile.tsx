import Image from 'next/image';
import { ProfileWithStats } from '../lib/bluesky';

interface ProfileProps {
  profile: ProfileWithStats;
}

export default function Profile({ profile }: ProfileProps) {
  return (
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
  );
}
