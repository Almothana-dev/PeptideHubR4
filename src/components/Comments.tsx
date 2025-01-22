import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ThumbsUp, ThumbsDown, Reply, Edit, Trash2, Send, ChevronDown, ChevronUp } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  stats: {
    upvotes: number;
    downvotes: number;
    reply_count: number;
  };
  userVote?: {
    is_upvote: boolean;
  } | null;
  replies?: Comment[];
}

interface CommentsProps {
  stackId: string;
}

export const Comments: React.FC<CommentsProps> = ({ stackId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [collapsedReplies, setCollapsedReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchComments();
  }, [stackId]);

  const fetchComments = async () => {
    try {
      // Fetch top-level comments first
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          is_edited,
          user:profiles(username, display_name, avatar_url)
        `)
        .eq('stack_id', stackId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Fetch stats and user votes for each comment
      const commentsWithDetails = await Promise.all((commentsData || []).map(async (comment) => {
        // Get comment stats
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_comment_stats', { comment_uuid: comment.id });

        if (statsError) throw statsError;

        // Get user's vote if logged in
        let userVote = null;
        if (user) {
          const { data: voteData, error: voteError } = await supabase
            .from('comment_votes')
            .select('is_upvote')
            .eq('comment_id', comment.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (voteError && voteError.code !== 'PGRST116') throw voteError;
          userVote = voteData;
        }

        // Fetch replies
        const { data: repliesData, error: repliesError } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            updated_at,
            is_edited,
            user:profiles(username, display_name, avatar_url)
          `)
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true });

        if (repliesError) throw repliesError;

        // Get stats and votes for replies
        const repliesWithDetails = await Promise.all((repliesData || []).map(async (reply) => {
          const { data: replyStatsData } = await supabase
            .rpc('get_comment_stats', { comment_uuid: reply.id });

          let replyUserVote = null;
          if (user) {
            const { data: replyVoteData } = await supabase
              .from('comment_votes')
              .select('is_upvote')
              .eq('comment_id', reply.id)
              .eq('user_id', user.id)
              .maybeSingle();

            replyUserVote = replyVoteData;
          }

          return {
            ...reply,
            stats: replyStatsData[0] || { upvotes: 0, downvotes: 0, reply_count: 0 },
            userVote: replyUserVote
          };
        }));

        return {
          ...comment,
          stats: statsData[0] || { upvotes: 0, downvotes: 0, reply_count: 0 },
          userVote,
          replies: repliesWithDetails
        };
      }));

      setComments(commentsWithDetails);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .insert([
          {
            stack_id: stackId,
            user_id: user.id,
            content: newComment.trim(),
            parent_id: parentId || null
          }
        ])
        .select()
        .single();

      if (commentError) throw commentError;

      setNewComment('');
      setReplyingTo(null);
      await fetchComments(); // Refresh comments
    } catch (error) {
      console.error('Error posting comment:', error);
      setError('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editContent.trim() || submitting || !editingComment) return;

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('comments')
        .update({
          content: editContent.trim(),
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingComment)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setEditingComment(null);
      setEditContent('');
      await fetchComments(); // Refresh comments
    } catch (error) {
      console.error('Error updating comment:', error);
      setError('Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      await fetchComments(); // Refresh comments
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment');
    }
  };

  const handleVote = async (commentId: string, isUpvote: boolean) => {
    if (!user) return;

    try {
      const { data: existingVote, error: checkError } = await supabase
        .from('comment_votes')
        .select('id, is_upvote')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingVote) {
        if (existingVote.is_upvote === isUpvote) {
          // Remove vote if clicking the same button
          const { error: deleteError } = await supabase
            .from('comment_votes')
            .delete()
            .eq('id', existingVote.id);

          if (deleteError) throw deleteError;
        } else {
          // Update vote if changing from up to down or vice versa
          const { error: updateError } = await supabase
            .from('comment_votes')
            .update({ is_upvote: isUpvote })
            .eq('id', existingVote.id);

          if (updateError) throw updateError;
        }
      } else {
        // Create new vote
        const { error: insertError } = await supabase
          .from('comment_votes')
          .insert([
            {
              comment_id: commentId,
              user_id: user.id,
              is_upvote: isUpvote
            }
          ]);

        if (insertError) throw insertError;
      }

      await fetchComments(); // Refresh comments
    } catch (error) {
      console.error('Error handling vote:', error);
      setError('Failed to update vote');
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return d.toLocaleDateString();
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'just now';
    }
  };

  const toggleReplies = (commentId: string) => {
    setCollapsedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isCollapsed = collapsedReplies.has(comment.id);

    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 mt-4' : 'mb-6'}`}>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <img
                src={comment.user.avatar_url || `https://ui-avatars.com/api/?name=${comment.user.display_name || comment.user.username}&background=0065A7&color=fff`}
                alt={comment.user.display_name || comment.user.username}
                className="w-8 h-8 rounded-full"
              />
              <div>
                <span className="font-medium">
                  {comment.user.display_name || comment.user.username}
                </span>
                <div className="text-sm text-gray-500">
                  {formatDate(comment.created_at)}
                  {comment.is_edited && ' (edited)'}
                </div>
              </div>
            </div>
            {user?.id === comment.user.id && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="text-gray-400 hover:text-[#0065A7]"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {editingComment === comment.id ? (
            <form onSubmit={handleEdit} className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:border-[#0065A7]"
                rows={3}
                maxLength={2000}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1 text-sm bg-[#0065A7] text-white rounded-lg hover:bg-[#005490] disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          )}

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVote(comment.id, true)}
                className={`p-1 rounded hover:bg-gray-100 ${
                  comment.userVote?.is_upvote ? 'text-green-500' : 'text-gray-400'
                }`}
                title="Upvote"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-500">{comment.stats.upvotes}</span>
              <button
                onClick={() => handleVote(comment.id, false)}
                className={`p-1 rounded hover:bg-gray-100 ${
                  comment.userVote?.is_upvote === false ? 'text-red-500' : 'text-gray-400'
                }`}
                title="Downvote"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-500">{comment.stats.downvotes}</span>
            </div>
            {!isReply && (
              <>
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-sm text-[#0065A7] hover:underline flex items-center gap-1"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
                {hasReplies && (
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="text-sm text-gray-500 hover:text-[#0065A7] flex items-center gap-1"
                  >
                    {isCollapsed ? (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide replies
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {replyingTo === comment.id && (
            <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-4">
              <div className="flex gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:border-[#0065A7]"
                  rows={2}
                  maxLength={2000}
                />
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="px-3 py-1 bg-[#0065A7] text-white rounded-lg hover:bg-[#005490] disabled:opacity-50 self-end"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Render replies */}
        {hasReplies && !isCollapsed && (
          <div className="space-y-4">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Comments</h2>

      {/* New comment form */}
      {user ? (
        <form onSubmit={(e) => handleSubmit(e)} className="mb-8">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full p-4 border rounded-lg focus:outline-none focus:border-[#0065A7]"
            rows={3}
            maxLength={2000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500">
              {newComment.length}/2000 characters
            </span>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-[#0065A7] text-white rounded-lg hover:bg-[#005490] disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Comment
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Please{' '}
            <Link to="/login" className="text-[#0065A7] hover:underline">
              sign in
            </Link>{' '}
            to leave a comment.
          </p>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-8">Loading comments...</div>
      ) : error ? (
        <div className="text-red-600 text-center py-8">{error}</div>
      ) : comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map(comment => renderComment(comment))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  );
};
