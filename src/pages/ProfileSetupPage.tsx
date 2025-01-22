import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { ProfileFormData } from '../types/profile';
import { Camera, AlertCircle, Plus } from 'lucide-react';

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

export const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { updateProfile, uploadAvatar, refreshProfile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [morbidityInput, setMorbidityInput] = useState('');
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: '',
    bio: '',
    location: '',
    professional_title: '',
    diet_type: 'None',
    custom_diet: '',
    morbidities: [],
  });

  // ... (keep existing handleAvatarChange function)

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

  // ... (keep existing validateForm and handleSubmit functions)

  return (
    <div className="min-h-screen bg-[#F6F6F6] py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold mb-6">Complete Your Profile</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... (keep existing avatar upload and other fields) ... */}

            {/* Diet Type */}
            <div>
              <label
                htmlFor="diet_type"
                className="block text-sm font-medium text-gray-700"
              >
                Diet Type
              </label>
              <select
                id="diet_type"
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
                <label
                  htmlFor="custom_diet"
                  className="block text-sm font-medium text-gray-700"
                >
                  Specify Diet
                </label>
                <input
                  type="text"
                  id="custom_diet"
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
                  className="bg-[#0065A7] text-white px-4 py-2 rounded-lg hover:bg-[#005490] transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
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

            {/* ... (keep existing error display and submit button) ... */}
          </form>
        </div>
      </div>
    </div>
  );
};
