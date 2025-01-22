import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { StarRating } from '../components/StarRating';
import { Comments } from '../components/Comments';
import { SaveProtocolButton } from '../components/SaveProtocolButton';
import { 
  ArrowLeft,
  User,
  Clock,
  ExternalLink,
  Beaker,
  Droplet,
  Repeat,
  AlertCircle,
  FileText,
  Link as LinkIcon
} from 'lucide-react';

interface Protocol {
  id: string;
  name: string;
  description: string;
  dosage: string;
  created_at: string;
  last_edited_at: string | null;
  edit_count: number;
  creator: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
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

export const ProtocolDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProtocolDetails();
    }
  }, [id]);

  const fetchProtocolDetails = async () => {
    try {
      const { data: protocolData, error: protocolError } = await supabase
        .from('stacks')
        .select(`
          id,
          name,
          description,
          dosage,
          created_at,
          last_edited_at,
          edit_count,
          creator:profiles(username, display_name, avatar_url),
          category:categories(name, emoji),
          additional_categories:stack_categories(
            category:categories(name, emoji)
          ),
          references:stack_references(pmid)
        `)
        .eq('id', id)
        .single();

      if (protocolError) throw protocolError;

      // Fetch stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_stack_stats', { stack_uuid: id });

      if (statsError) throw statsError;

      setProtocol({
        ...protocolData,
        stats: {
          average_rating: statsData[0]?.average_rating || 0,
          review_count: statsData[0]?.review_count || 0
        }
      });
    } catch (error) {
      console.error('Error fetching protocol:', error);
      setError('Failed to load protocol details');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = async (newRating: number) => {
    await fetchProtocolDetails();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            Loading protocol details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !protocol) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-4">
                <Link
                  to="/protocols"
                  className="text-gray-600 hover:text-[#0065A7] flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Protocols
                </Link>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                {error || 'Protocol not found'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Back Button */}
          <Link
            to="/protocols"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#0065A7]"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Protocols
          </Link>

          {/* Protocol Header */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                  {protocol.name}
                  {protocol.category?.emoji && (
                    <span>{protocol.category.emoji}</span>
                  )}
                </h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{protocol.creator.display_name || protocol.creator.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(protocol.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <SaveProtocolButton stackId={protocol.id} />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-6">
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
            <div className="flex items-center gap-4 mb-6">
              <StarRating
                stackId={protocol.id}
                initialRating={protocol.stats.average_rating}
                onRatingChange={handleRatingChange}
                size="lg"
              />
              <span className="text-gray-500">
                ({protocol.stats.review_count} {protocol.stats.review_count === 1 ? 'review' : 'reviews'})
              </span>
            </div>

            {/* Description */}
            {protocol.description && (
              <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 p-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="bg-[#0065A7]/10 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-[#0065A7]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <div className="prose max-w-none">
                      {protocol.description.split('\n').map((paragraph, index) => (
                        <p key={index} className="text-gray-700 mb-4 last:mb-0 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Supplements */}
            {protocol.dosage && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Beaker className="w-6 h-6 text-[#0065A7]" />
                  Supplements
                </h3>
                <div className="grid gap-4">
                  {protocol.dosage.split(';').map((dose, index) => {
                    if (!dose.trim()) return null;
                    const [name, details] = dose.split(':').map(s => s.trim());
                    if (!details) return null;
                    const [dosage, method] = details.split('(').map(s => s.replace(')', '').trim());
                    
                    return (
                      <div 
                        key={index}
                        className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-6 border border-gray-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-[#0065A7]/10 p-3 rounded-lg">
                            <Beaker className="w-6 h-6 text-[#0065A7]" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                              {name}
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100">
                                <Droplet className="w-5 h-5 text-[#0065A7]" />
                                <div>
                                  <div className="text-sm text-gray-500">Dosage</div>
                                  <div className="font-medium">{dosage}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100">
                                <Repeat className="w-5 h-5 text-[#0065A7]" />
                                <div>
                                  <div className="text-sm text-gray-500">Method</div>
                                  <div className="font-medium">{method}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* References */}
            {protocol.references && protocol.references.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
                  <LinkIcon className="w-6 h-6 text-[#0065A7]" />
                  References
                </h3>
                <div className="space-y-2">
                  {protocol.references.map((ref) => (
                    <a
                      key={ref.pmid}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}`}
                      className="flex items-center gap-2 text-gray-600 hover:text-[#0065A7] group"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>PMID: {ref.pmid}</span>
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <Comments stackId={protocol.id} />
          </div>
        </div>
      </div>
    </div>
  );
};
