import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface StarRatingProps {
  stackId: string;
  initialRating: number;
  onRatingChange: (newRating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  stackId,
  initialRating,
  onRatingChange,
  size = 'md',
  readonly = false
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(initialRating);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState(initialRating);

  useEffect(() => {
    if (stackId) {
      fetchRatings();
    }
  }, [stackId, user]);

  const fetchRatings = async () => {
    try {
      // Fetch average rating
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_stack_stats', { stack_uuid: stackId });

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        setAverageRating(statsData[0].average_rating);
      }

      // Only fetch user's rating if they're logged in
      if (user) {
        const { data: userRatingData, error: userRatingError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('stack_id', stackId)
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle() instead of single()

        if (userRatingError && userRatingError.code !== 'PGRST116') {
          throw userRatingError;
        }

        if (userRatingData) {
          setUserRating(userRatingData.rating);
          setRating(userRatingData.rating);
        }
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleRating = async (value: number) => {
    if (readonly || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data: existingReviews, error: checkError } = await supabase
        .from('reviews')
        .select('id')
        .eq('stack_id', stackId)
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() here too

      if (checkError) throw checkError;

      if (existingReviews) {
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            rating: value,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReviews.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('reviews')
          .insert([
            {
              stack_id: stackId,
              user_id: user.id,
              rating: value,
              created_at: new Date().toISOString()
            }
          ]);

        if (insertError) throw insertError;
      }

      setRating(value);
      setUserRating(value);
      onRatingChange(value);
      
      // Refetch ratings to update the average
      await fetchRatings();
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to render partially filled stars for decimal ratings
  const renderStar = (index: number) => {
    const starValue = index + 1;
    const fillPercentage = Math.max(0, Math.min(100, (averageRating - index) * 100));
    
    return (
      <button
        key={index}
        type="button"
        disabled={readonly || !user || isSubmitting}
        onClick={() => handleRating(starValue)}
        onMouseEnter={() => !readonly && setHoveredRating(starValue)}
        onMouseLeave={() => !readonly && setHoveredRating(0)}
        className={`${
          readonly || !user ? 'cursor-default' : 'cursor-pointer'
        } transition-colors focus:outline-none relative`}
        title={!user ? 'Sign in to rate this protocol' : undefined}
      >
        <div className="relative">
          {/* Background star (empty) */}
          <Star
            className={`
              ${starSizes[size]}
              fill-none text-gray-300
              absolute top-0 left-0
            `}
          />
          {/* Foreground star (filled) */}
          <div style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}>
            <Star
              className={`
                ${starSizes[size]}
                fill-yellow-400 text-yellow-400
              `}
            />
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map(renderStar)}
    </div>
  );
};
