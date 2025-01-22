import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { StarRating } from './StarRating';
import { Edit, Trash2, ExternalLink, Clock } from 'lucide-react';

interface UserProtocol {
  id: string;
  name: string;
  description: string;
  category: {
    name: string;
    emoji: string;
  };
  additional_categories: {
    category: {
      name: string;
      emoji: string;
    };
  }[];
  stats: {
    average_rating: number;
    review_count: number;
  };
  created_at: string;
  last_edited_at: string | null;
  edit_count: number;
}

export const UserProtocols: React.FC<{ userId: string }> = ({ userId }) => {
  const [protocols, setProtocols] = useState<UserProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProtocols();
  }, [userId]);

  const fetchUserProtocols = async () => {
    try {
      const { data: protocolsData, error: protocolsError } = await supabase
        .from('stacks')
        .select(`
          id,
          name,
          description,
          created_at,
          last_edited_at,
          edit_count,
          category:categories(name, emoji),
          additional_categories:stack_categories(
            category:categories(name, emoji)
          )
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (protocolsError) throw protocolsError;

      // Fetch stats for each protocol
      const protocolsWithStats = await Promise.all((protocolsData || []).map(async (protocol) => {
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_stack_stats', { stack_uuid: protocol.id });

        if (statsError) {
          console.error('Error fetching stats:', statsError);
          return {
            ...protocol,
            stats: {
              average_rating: 0,
              review_count: 0
            }
          };
        }

        return {
          ...protocol,
          stats: {
            average_rating: statsData[0]?.average_rating || 0,
            review_count: statsData[0]?.review_count || 0
          }
        };
      }));

      setProtocols(protocolsWithStats);
    } catch (error) {
      console.error('Error fetching user protocols:', error);
      setError('Failed to load protocols');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return past.toLocaleDateString();
  };

  if (loading) {
    return <div className="text-center py-8">Loading protocols...</div>;
  }

  if (error) {
    return (
      <div className="text-red-600 flex items-center gap-2 justify-center py-8">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  if (protocols.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        You haven't created any protocols yet.
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
              <h3 className="text-xl font-semibold text-gray-900">
                {protocol.name}
              </h3>
              <p className="text-gray-600 mt-1 line-clamp-2">
                {protocol.description}
              </p>
            </div>
            <Link
              to={`/protocols/${protocol.id}/edit`}
              className="text-gray-400 hover:text-[#0065A7] p-2"
            >
              <Edit className="w-5 h-5" />
            </Link>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-4">
            {protocol.category && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#0065A7]/10 text-[#0065A7]">
                {protocol.category.emoji} {protocol.category.name}
              </span>
            )}
            {protocol.additional_categories?.map(({ category }) => (
              <span 
                key={category.name}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#0065A7]/5 text-[#0065A7]"
              >
                {category.emoji} {category.name}
              </span>
            ))}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
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

          {/* Timestamps */}
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>Created {new Date(protocol.created_at).toLocaleDateString()}</span>
              {protocol.last_edited_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Edited {formatTimeAgo(protocol.last_edited_at)}
                  {protocol.edit_count > 1 && ` (${protocol.edit_count} edits)`}
                </span>
              )}
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
