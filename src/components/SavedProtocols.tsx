import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { StarRating } from './StarRating';
import { SaveProtocolButton } from './SaveProtocolButton';
import { ExternalLink } from 'lucide-react';

interface SavedProtocol {
  id: string;
  name: string;
  description: string;
  creator: {
    username: string;
  };
  category: {
    name: string;
    emoji: string;
  };
  stats: {
    average_rating: number;
    review_count: number;
  };
}

export const SavedProtocols: React.FC<{ userId: string }> = ({ userId }) => {
  const [protocols, setProtocols] = useState<SavedProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedProtocols();
  }, [userId]);

  const fetchSavedProtocols = async () => {
    try {
      const { data: savedData, error: savedError } = await supabase
        .from('saved_protocols')
        .select(`
          stack_id,
          stack:stacks(
            id,
            name,
            description,
            creator:profiles(username),
            category:categories(name, emoji)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (savedError) throw savedError;

      // Fetch stats for each protocol
      const protocolsWithStats = await Promise.all((savedData || []).map(async ({ stack }) => {
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_stack_stats', { stack_uuid: stack.id });

        if (statsError) {
          console.error('Error fetching stats:', statsError);
          return {
            ...stack,
            stats: {
              average_rating: 0,
              review_count: 0
            }
          };
        }

        return {
          ...stack,
          stats: {
            average_rating: statsData[0]?.average_rating || 0,
            review_count: statsData[0]?.review_count || 0
          }
        };
      }));

      setProtocols(protocolsWithStats);
    } catch (error) {
      console.error('Error fetching saved protocols:', error);
      setError('Failed to load saved protocols');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading saved protocols...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  if (protocols.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No saved protocols yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {protocols.map((protocol) => (
        <div
          key={protocol.id}
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                {protocol.name}
                {protocol.category?.emoji && (
                  <span>{protocol.category.emoji}</span>
                )}
              </h3>
              <p className="text-gray-500">by {protocol.creator.username}</p>
            </div>
            <SaveProtocolButton stackId={protocol.id} initialSaved={true} />
          </div>

          <p className="text-gray-600 mb-4 line-clamp-2">{protocol.description}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StarRating
                stackId={protocol.id}
                initialRating={protocol.stats.average_rating}
                onRatingChange={() => {}}
                readonly
                size="sm"
              />
              <span className="text-sm text-gray-500">
                ({protocol.stats.review_count} {protocol.stats.review_count === 1 ? 'review' : 'reviews'})
              </span>
            </div>
            <Link
              to={`/protocols/${protocol.id}`}
              className="text-[#0065A7] hover:text-[#005490] inline-flex items-center gap-1"
            >
              View Details
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};
