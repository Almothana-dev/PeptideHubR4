import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { StarRating } from '../components/StarRating';
import { SaveProtocolButton } from '../components/SaveProtocolButton';
import { Search, Plus, ExternalLink, Clock, User } from 'lucide-react';

interface Stack {
  id: string;
  name: string;
  description: string;
  dosage: string;
  created_at: string;
  creator: {
    username: string;
    display_name: string | null;
  };
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
  references: {
    pmid: string;
  }[];
  stats: {
    average_rating: number;
    review_count: number;
  };
}

export const ProtocolsPage: React.FC = () => {
  const navigate = useNavigate();
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchStacks();
    }
  }, [sortBy, loading]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }
    setLoading(false);
  };

  const fetchStacks = async () => {
    try {
      let query = supabase.from('stacks').select(`
          id,
          name,
          description,
          dosage,
          created_at,
          creator:profiles(username, display_name),
          category:categories(name, emoji),
          additional_categories:stack_categories(
            category:categories(name, emoji)
          ),
          references:stack_references(pmid)
        `);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      }

      const { data: stacksData, error: stacksError } = await query;

      if (stacksError) throw stacksError;

      const stacksWithStats = await Promise.all(
        (stacksData || []).map(async (stack) => {
          const { data: statsData, error: statsError } = await supabase.rpc(
            'get_stack_stats',
            { stack_uuid: stack.id }
          );

          if (statsError) {
            console.error('Error fetching stats:', statsError);
            return {
              ...stack,
              stats: {
                average_rating: 0,
                review_count: 0,
              },
            };
          }

          return {
            ...stack,
            stats: {
              average_rating: statsData[0]?.average_rating || 0,
              review_count: statsData[0]?.review_count || 0,
            },
          };
        })
      );

      if (sortBy === 'popular') {
        stacksWithStats.sort(
          (a, b) => b.stats.average_rating - a.stats.average_rating
        );
      }

      setStacks(stacksWithStats);
    } catch (error) {
      console.error('Error fetching stacks:', error);
      setError('Failed to load protocols');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = async (stackId: string, newRating: number) => {
    await fetchStacks();
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return past.toLocaleDateString();
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">
            Protocols & Stacks
          </h1>
          <Link
            to="/protocols/create"
            className="bg-[#0065A7] text-white px-6 py-2 rounded-lg hover:bg-[#005490] transition inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Protocol
          </Link>
        </div>

        {/* Search and Sort */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search protocols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-[#0065A7]"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'newest' | 'popular')
              }
              className="px-4 py-2 border rounded-lg focus:outline-none focus:border-[#0065A7]"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Protocols Grid */}
        {error ? (
          <div className="text-red-600 text-center py-12">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stacks.map((stack) => (
              <div
                key={stack.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      {stack.name}
                      {stack.category?.emoji && (
                        <span>{stack.category.emoji}</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-4 text-gray-500 text-sm mt-1">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>
                          {stack.creator.display_name || stack.creator.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatTimeAgo(stack.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <SaveProtocolButton stackId={stack.id} />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {stack.category && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#0065A7]/10 text-[#0065A7]">
                      {stack.category.emoji} {stack.category.name}
                    </span>
                  )}
                  {stack.additional_categories?.map(({ category }) => (
                    <span
                      key={category.name}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#0065A7]/5 text-[#0065A7]"
                    >
                      {category.emoji} {category.name}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {stack.description}
                </p>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <StarRating
                    stackId={stack.id}
                    initialRating={stack.stats.average_rating}
                    onRatingChange={(newRating) =>
                      handleRatingChange(stack.id, newRating)
                    }
                    size="sm"
                  />
                  <span className="text-sm text-gray-500">
                    ({stack.stats.review_count}{' '}
                    {stack.stats.review_count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>

                {/* View Details Link */}
                <Link
                  to={`/protocols/${stack.id}`}
                  className="text-[#0065A7] hover:text-[#005490] inline-flex items-center gap-1 text-sm font-medium"
                >
                  View Details
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
