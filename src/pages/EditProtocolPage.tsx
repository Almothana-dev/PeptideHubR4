import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StackFormData, StackSupplement } from '../types/stack';
import { 
  AlertCircle, 
  Plus, 
  Trash2, 
  Beaker, 
  Clock, 
  Droplet, 
  Syringe, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  FileEdit,
  Save,
  ArrowLeft
} from 'lucide-react';

interface DosageUnit {
  id: string;
  name: string;
  symbol: string;
}

interface FrequencySchedule {
  id: string;
  name: string;
}

interface AdministrationMethod {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

export const EditProtocolPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dosageUnits, setDosageUnits] = useState<DosageUnit[]>([]);
  const [frequencySchedules, setFrequencySchedules] = useState<FrequencySchedule[]>([]);
  const [administrationMethods, setAdministrationMethods] = useState<AdministrationMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSupplementIndex, setActiveSupplementIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<StackFormData>({
    name: '',
    description: '',
    category_id: '',
    categories: [],
    supplements: []
  });

  const fetchFormData = async () => {
    try {
      const [unitsResponse, freqResponse, methodsResponse, catResponse] = await Promise.all([
        supabase.from('dosage_units').select('*').order('name'),
        supabase.from('frequency_schedules').select('*').order('name'),
        supabase.from('administration_methods').select('*').order('name'),
        supabase.from('categories').select('*').order('name')
      ]);

      if (unitsResponse.error) throw unitsResponse.error;
      if (freqResponse.error) throw freqResponse.error;
      if (methodsResponse.error) throw methodsResponse.error;
      if (catResponse.error) throw catResponse.error;

      setDosageUnits(unitsResponse.data);
      setFrequencySchedules(freqResponse.data);
      setAdministrationMethods(methodsResponse.data);
      setCategories(catResponse.data);
    } catch (error) {
      console.error('Error fetching form data:', error);
      throw error;
    }
  };

  const fetchProtocolData = async () => {
    try {
      const { data: stackData, error: stackError } = await supabase
        .from('stacks')
        .select(`
          *,
          stack_categories(category_id)
        `)
        .eq('id', id)
        .single();

      if (stackError) throw stackError;

      if (stackData.creator_id !== user?.id) {
        navigate('/protocols');
        return;
      }

      const { data: supplementsData, error: supplementsError } = await supabase
        .from('stack_supplements')
        .select(`
          id,
          name,
          description,
          dosage_amount,
          dosage_unit_id,
          frequency_amount,
          frequency_schedule_id,
          administration_method_id,
          notes
        `)
        .eq('stack_id', id);

      if (supplementsError) throw supplementsError;

      setFormData({
        name: stackData.name,
        description: stackData.description || '',
        category_id: stackData.category_id,
        categories: stackData.stack_categories.map((sc: any) => sc.category_id),
        supplements: supplementsData.map((supplement: any) => ({
          id: supplement.id,
          name: supplement.name,
          description: supplement.description || '',
          dosage_amount: supplement.dosage_amount,
          dosage_unit_id: supplement.dosage_unit_id,
          frequency_amount: supplement.frequency_amount,
          frequency_schedule_id: supplement.frequency_schedule_id,
          administration_method_id: supplement.administration_method_id,
          notes: supplement.notes || ''
        }))
      });
    } catch (error) {
      console.error('Error fetching protocol data:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!user || !id) {
      navigate('/protocols');
      return;
    }
    Promise.all([fetchFormData(), fetchProtocolData()]).then(() => {
      setLoading(false);
    }).catch((error) => {
      console.error('Error initializing page:', error);
      setError('Failed to load protocol data');
      setLoading(false);
    });
  }, [id, user]);

  const addSupplement = () => {
    setFormData(prev => ({
      ...prev,
      supplements: [
        ...prev.supplements,
        {
          id: crypto.randomUUID(),
          name: '',
          description: '',
          dosage_amount: 0,
          dosage_unit_id: '',
          frequency_amount: 1,
          frequency_schedule_id: '',
          administration_method_id: '',
          notes: ''
        }
      ]
    }));
  };

  const removeSupplement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      supplements: prev.supplements.filter((_, i) => i !== index)
    }));
  };

  const updateSupplement = (index: number, data: Partial<StackSupplement>) => {
    setFormData(prev => ({
      ...prev,
      supplements: prev.supplements.map((supplement, i) => 
        i === index ? { ...supplement, ...data } : supplement
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    
    setSaving(true);
    setError(null);

    try {
      if (formData.supplements.length === 0) {
        throw new Error('Please add at least one supplement to the protocol');
      }

      for (const supplement of formData.supplements) {
        if (!supplement.name.trim()) {
          throw new Error('All supplements must have a name');
        }
        if (supplement.dosage_amount <= 0) {
          throw new Error('All supplements must have a valid dosage amount');
        }
        if (!supplement.dosage_unit_id) {
          throw new Error('All supplements must have a dosage unit');
        }
        if (!supplement.frequency_schedule_id) {
          throw new Error('All supplements must have a frequency schedule');
        }
        if (!supplement.administration_method_id) {
          throw new Error('All supplements must have an administration method');
        }
      }

      const dosageString = formData.supplements.map(supplement => {
        const unit = dosageUnits.find(u => u.id === supplement.dosage_unit_id);
        const schedule = frequencySchedules.find(s => s.id === supplement.frequency_schedule_id);
        const method = administrationMethods.find(m => m.id === supplement.administration_method_id);
        
        return `${supplement.name}: ${supplement.dosage_amount}${unit?.symbol || ''} ${supplement.frequency_amount}x ${schedule?.name || ''} (${method?.name || ''})`;
      }).join('; ');

      const { error: stackError } = await supabase
        .from('stacks')
        .update({
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id,
          dosage: dosageString,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (stackError) throw stackError;

      const { error: deleteError } = await supabase
        .from('stack_categories')
        .delete()
        .eq('stack_id', id);

      if (deleteError) throw deleteError;

      if (formData.categories.length > 0) {
        const { error: catError } = await supabase
          .from('stack_categories')
          .insert(
            formData.categories.map(categoryId => ({
              stack_id: id,
              category_id: categoryId,
            }))
          );

        if (catError) throw catError;
      }

      const { error: deleteSuppsError } = await supabase
        .from('stack_supplements')
        .delete()
        .eq('stack_id', id);

      if (deleteSuppsError) throw deleteSuppsError;

      const { error: suppError } = await supabase
        .from('stack_supplements')
        .insert(
          formData.supplements.map(supplement => ({
            stack_id: id,
            ...supplement,
            updated_at: new Date().toISOString()
          }))
        );

      if (suppError) throw suppError;

      navigate('/protocols');
    } catch (error) {
      console.error('Error updating protocol:', error);
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F6F6] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center">Loading protocol data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/protocols')}
              className="text-gray-600 hover:text-[#0065A7] flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Protocols
            </button>
            <h1 className="text-2xl font-bold">Edit Protocol</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Protocol Name */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-4 mb-4">
                <FileEdit className="w-6 h-6 text-[#0065A7]" />
                <h2 className="text-xl font-semibold">Basic Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Protocol Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                  />
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-4 mb-4">
                <Sparkles className="w-6 h-6 text-[#0065A7]" />
                <h2 className="text-xl font-semibold">Categories</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Primary Category *
                  </label>
                  <select
                    id="category"
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.emoji} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Categories
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {categories.map(category => (
                      <label key={category.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.categories.includes(category.id)}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              categories: e.target.checked
                                ? [...prev.categories, category.id]
                                : prev.categories.filter(id => id !== category.id)
                            }));
                          }}
                          className="rounded border-gray-300 text-[#0065A7] focus:ring-[#0065A7]"
                        />
                        <span>
                          {category.emoji} {category.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Supplements */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <Beaker className="w-6 h-6 text-[#0065A7]" />
                  <h2 className="text-xl font-semibold">Supplements</h2>
                </div>
                <button
                  type="button"
                  onClick={addSupplement}
                  className="bg-[#0065A7] text-white px-4 py-2 rounded-lg hover:bg-[#005490] transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Supplement
                </button>
              </div>

              <div className="space-y-4">
                {formData.supplements.map((supplement, index) => (
                  <div 
                    key={supplement.id} 
                    className="border rounded-lg overflow-hidden"
                  >
                    <div 
                      className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => setActiveSupplementIndex(activeSupplementIndex === index ? null : index)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-[#0065A7] text-white rounded-full flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {supplement.name || 'New Supplement'}
                          </h3>
                          {supplement.dosage_amount > 0 && (
                            <p className="text-sm text-gray-500">
                              {supplement.dosage_amount}
                              {dosageUnits.find(u => u.id === supplement.dosage_unit_id)?.symbol}
                              {' × '}
                              {supplement.frequency_amount}
                              {' '}
                              {frequencySchedules.find(f => f.id === supplement.frequency_schedule_id)?.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSupplement(index);
                          }}
                          className="text-gray-400 hover:text-red-500 p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        {activeSupplementIndex === index ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {activeSupplementIndex === index && (
                      <div className="p-6 space-y-6">
                        {/* Supplement Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Supplement Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={supplement.name}
                            onChange={(e) => updateSupplement(index, { name: e.target.value })}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                          />
                        </div>

                        {/* Dosage Amount and Unit */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              <div className="flex items-center gap-2">
                                <Droplet className="w-4 h-4 text-[#0065A7]" />
                                Dosage Amount *
                              </div>
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              step="any"
                              value={supplement.dosage_amount}
                              onChange={(e) => updateSupplement(index, { 
                                dosage_amount: parseFloat(e.target.value) || 0 
                              })}
                              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Unit *
                            </label>
                            <select
                              required
                              value={supplement.dosage_unit_id}
                              onChange={(e) => updateSupplement(index, { 
                                dosage_unit_id: e.target.value 
                              })}
                              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                            >
                              <option value="">Select unit</option>
                              {dosageUnits.map(unit => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.name} ({unit.symbol})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Frequency Amount and Schedule */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#0065A7]" />
                                Frequency Amount *
                              </div>
                            </label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={supplement.frequency_amount}
                              onChange={(e) => updateSupplement(index, { 
                                frequency_amount: parseInt(e.target.value) || 1 
                              })}
                              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Schedule *
                            </label>
                            <select
                              required
                              value={supplement.frequency_schedule_id}
                              onChange={(e) => updateSupplement(index, { 
                                frequency_schedule_id: e.target.value 
                              })}
                              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                            >
                              <option value="">Select schedule</option>
                              {frequencySchedules.map(schedule => (
                                <option key={schedule.id} value={schedule.id}>
                                  {schedule.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Administration Method */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            <div className="flex items-center gap-2">
                              <Syringe className="w-4 h-4 text-[#0065A7]" />
                              Administration Method *
                            </div>
                          </label>
                          <select
                            required
                            value={supplement.administration_method_id}
                            onChange={(e) => updateSupplement(index, { 
                              administration_method_id: e.target.value 
                            })}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                          >
                            <option value="">Select method</option>
                            {administrationMethods.map(method => (
                              <option key={method.id} value={method.id}>
                                {method.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Notes
                          </label>
                          <textarea
                            value={supplement.notes || ''}
                            onChange={(e) => updateSupplement(index, { notes: e.target.value })}
                            rows={2}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                            placeholder="Optional notes about this supplement..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {formData.supplements.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">
                      No supplements added yet. Click "Add Supplement" to get started.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/protocols')}
                className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0065A7] text-white px-6 py-3 rounded-lg hover:bg-[#005490] disabled:opacity-50 transition flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
