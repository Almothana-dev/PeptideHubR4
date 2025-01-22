import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SaveProtocolButtonProps {
  stackId: string;
  initialSaved?: boolean;
}

export const SaveProtocolButton: React.FC<SaveProtocolButtonProps> = ({
  stackId,
  initialSaved = false,
}) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    if (user) {
      checkIfSaved();
    }
    getFavoriteCount();
  }, [user, stackId]);

  const getFavoriteCount = async () => {
    try {
      const { count, error } = await supabase
        .from('saved_protocols')
        .select('*', { count: 'exact' })
        .eq('stack_id', stackId);

      if (error) throw error;
      setFavoriteCount(count || 0);
    } catch (error) {
      console.error('Error getting favorite count:', error);
    }
  };

  const checkIfSaved = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_protocols')
        .select('id')
        .eq('user_id', user?.id)
        .eq('stack_id', stackId);

      if (error) throw error;
      setIsSaved(data && data.length > 0);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const toggleSave = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    setIsLoading(true);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_protocols')
          .delete()
          .eq('user_id', user.id)
          .eq('stack_id', stackId);

        if (error) throw error;
        setIsSaved(false);
        setFavoriteCount((prev) => prev - 1);
      } else {
        const { error } = await supabase.from('saved_protocols').insert([
          {
            user_id: user.id,
            stack_id: stackId,
          },
        ]);

        if (error) throw error;
        setIsSaved(true);
        setFavoriteCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={toggleSave}
      disabled={isLoading}
      className={`p-2 rounded-full transition-colors flex items-center gap-1 ${
        isSaved
          ? 'text-red-500 hover:bg-red-50'
          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
      }`}
      title={isSaved ? 'Remove from saved' : 'Save protocol'}
    >
      <Heart
        className={`w-5 h-5 ${isSaved ? 'fill-current' : ''} ${
          isLoading ? 'opacity-50' : ''
        }`}
      />
      <span className="text-sm font-medium">{favoriteCount}</span>
    </button>
  );
};
