import React, { useState, useEffect } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import {
  AlertCircle,
  Camera,
  MapPin,
  Briefcase,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import { ProfileFormData } from '../types/profile';
import { UserProtocols } from '../components/UserProtocols';
import { SavedProtocols } from '../components/SavedProtocols';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const DIET_OPTIONS = [
  'None',
  'Keto',
  'Carnivore',
  'Low Carb',
  'Vegan',
  'Vegetarian',
  'Paleo',
  'Mediterranean',
  'Other',
];

export const ProfilePage: React.FC = () => {
  // ... (keep existing state and hooks)

  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: '',
    bio: '',
    location: '',
    professional_title: '',
    diet_type: 'None',
    custom_diet: '',
    morbidities: [],
  });
  const [morbidityInput, setMorbidityInput] = useState('');

  // Update form data when profile data becomes available
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        professional_title: profile.professional_title || '',
        diet_type: profile.diet_type || 'None',
        custom_diet: profile.custom_diet || '',
        morbidities: profile.morbidities || [],
      });
    }
  }, [profile]);

  // ... (keep existing functions)

  const handleAddMorbidity = () => {
    if (morbidityInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        morbidities: [...prev.morbidities, morbidityInput.trim()],
      }));
      setMorbidityInput('');
    }
  };

  const handleRemoveMorbidity = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      morbidities: prev.morbidities.filter((_, i) => i !== index),
    }));
  };

  // ... (keep existing loading and error states)

  return (
    <div className="min-h-screen bg-[#F6F6F6] py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* ... (keep existing header section) ... */}

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ... (keep existing form fields) ... */}

                {/* Diet Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Diet Type
                  </label>
                  <select
                    value={formData.diet_type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        diet_type: e.target.value,
                        custom_diet:
                          e.target.value !== 'Other' ? '' : prev.custom_diet,
                      }))
                    }
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                  >
                    {DIET_OPTIONS.map((diet) => (
                      <option key={diet} value={diet}>
                        {diet}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Diet Input */}
                {formData.diet_type === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Specify Diet
                    </label>
                    <input
                      type="text"
                      value={formData.custom_diet}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          custom_diet: e.target.value,
                        }))
                      }
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                    />
                  </div>
                )}

                {/* Morbidities */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Morbidities
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={morbidityInput}
                      onChange={(e) => setMorbidityInput(e.target.value)}
                      placeholder="Enter any health conditions"
                      className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMorbidity();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddMorbidity}
                      className="bg-[#0065A7] text-white px-4 py-2 rounded-lg hover:bg-[#005490] transition"
                    >
                      Add
                    </button>
                  </div>
                  {formData.morbidities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.morbidities.map((morbidity, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm"
                        >
                          {morbidity}
                          <button
                            type="button"
                            onClick={() => handleRemoveMorbidity(index)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ... (keep existing form buttons) ... */}
              </form>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  {/* ... (keep existing profile info) ... */}

                  {/* Add Diet Type Display */}
                  {profile?.diet_type && profile.diet_type !== 'None' && (
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <UtensilsCrossed className="w-4 h-4" />
                      Diet:{' '}
                      {profile.diet_type === 'Other'
                        ? profile.custom_diet
                        : profile.diet_type}
                    </div>
                  )}

                  {/* Add Morbidities Display */}
                  {profile?.morbidities && profile.morbidities.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm text-gray-600 mb-1">
                        Morbidities:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.morbidities.map((morbidity, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700"
                          >
                            {morbidity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ... (keep existing bio display) ... */}
              </>
            )}
          </div>

          {/* ... (keep existing sections) ... */}
        </div>
      </div>
    </div>
  );
};
