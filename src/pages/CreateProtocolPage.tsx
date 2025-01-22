import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StackFormData, StackSupplement } from '../types/stack';
import { AlertCircle, Plus, Trash2, Link, Beaker, Clock, Droplet, Syringe } from 'lucide-react';

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

interface Reference {
  id: string;
  type: 'pubmed' | 'doi' | 'other';
  identifier: string;
}

interface StackFormData {
  name: string;
  description: string;
  category_id: string;
  categories: string[];
  supplements: StackSupplement[];
  references: Reference[];
}

export const CreateProtocolPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dosageUnits, setDosageUnits] = useState<DosageUnit[]>([]);
  const [frequencySchedules, setFrequencySchedules] = useState<FrequencySchedule[]>([]);
  const [administrationMethods, setAdministrationMethods] = useState<AdministrationMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState<StackFormData>({
    name: '',
    description: '',
    category_id: '',
    categories: [],
    supplements: [],
    references: []
  });

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      // Fetch dosage units
      const { data: unitsData, error: unitsError } = await supabase
        .from('dosage_units')
        .select('*')
        .order('name');
      
      if (unitsError) throw unitsError;
      setDosageUnits(unitsData);

      // Fetch frequency schedules
      const { data: freqData, error: freqError } = await supabase
        .from('frequency_schedules')
        .select('*')
        .order('name');
      
      if (freqError) throw freqError;
      setFrequencySchedules(freqData);

      // Fetch administration methods
      const { data: methodsData, error: methodsError } = await supabase
        .from('administration_methods')
        .select('*')
        .order('name');
      
      if (methodsError) throw methodsError;
      setAdministrationMethods(methodsData);

      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (catError) throw catError;
      setCategories(catData);
    } catch (error) {
      console.error('Error fetching form data:', error);
      setError('Failed to load form data. Please try again.');
    }
  };

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
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Validate supplements
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

      // Generate dosage string from supplements
      const dosageString = formData.supplements.map(supplement => {
        const unit = dosageUnits.find(u => u.id === supplement.dosage_unit_id);
        const schedule = frequencySchedules.find(s => s.id === supplement.frequency_schedule_id);
        const method = administrationMethods.find(m => m.id === supplement.administration_method_id);
        
        return `${supplement.name}: ${supplement.dosage_amount}${unit?.symbol || ''} ${supplement.frequency_amount}x ${schedule?.name || ''} (${method?.name || ''})`;
      }).join('; ');

      // Create the stack
      const { data: stackData, error: stackError } = await supabase
        .from('stacks')
        .insert([{
          name: formData.name,
          description: formData.description,
          creator_id: user.id,
          category_id: formData.category_id,
          dosage: dosageString,
          version: 1,
          is_public: true,
          is_draft: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (stackError) throw stackError;

      // Add categories
      if (formData.categories.length > 0) {
        const { error: catError } = await supabase
          .from('stack_categories')
          .insert(
            formData.categories.map(categoryId => ({
              stack_id: stackData.id,
              category_id: categoryId,
            }))
          );

        if (catError) throw catError;
      }

      // Add supplements
      const { error: suppError } = await supabase
        .from('stack_supplements')
        .insert(
          formData.supplements.map(supplement => ({
            stack_id: stackData.id,
            ...supplement,
            created_at: new Date().toISOString(),
          }))
        );

      if (suppError) throw suppError;

      // Add references
      if (formData.references.length > 0) {
        const { error: refError } = await supabase
          .from('protocol_references')
          .insert(
            formData.references.map(ref => ({
              stack_id: stackData.id,
              reference_type: ref.type,
              reference_id: ref.identifier,
            }))
          );

        if (refError) throw refError;
      }

      navigate('/protocols');
    } catch (error) {
      console.error('Error creating protocol:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F6F6] py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h1 className="text-2xl font-bold mb-6">Create New Protocol</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Protocol Name */}
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
                  placeholder="e.g., BPC-157 Healing Protocol"
                />
              </div>

              {/* Primary Category */}
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

              {/* Additional Categories */}
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

              {/* Supplements */}
              <div>
                <div className="flex justify-between items-center mb-4">
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

                <div className="space-y-6">
                  {formData.supplements.map((supplement, index) => (
                    <div key={supplement.id} className="bg-gray-50 p-6 rounded-lg relative">
                      <button
                        type="button"
                        onClick={() => removeSupplement(index)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <div className="grid gap-6">
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

              {/* References Section */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <Link className="w-6 h-6 text-[#0065A7]" />
                    <h2 className="text-xl font-semibold">References</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        references: [
                          ...prev.references,
                          {
                            id: crypto.randomUUID(),
                            type: 'pubmed',
                            identifier: ''
                          }
                        ]
                      }));
                    }}
                    className="bg-[#0065A7] text-white px-4 py-2 rounded-lg hover:bg-[#005490] transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Reference
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.references.map((reference, index) => (
                    <div key={reference.id} className="flex items-center gap-4">
                      <select
                        value={reference.type}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            references: prev.references.map((ref, i) =>
                              i === index ? { ...ref, type: e.target.value as 'pubmed' | 'doi' | 'other' } : ref
                            )
                          }));
                        }}
                        className="w-32 rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                      >
                        <option value="pubmed">PubMed</option>
                        <option value="doi">DOI</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="text"
                        value={reference.identifier}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            references: prev.references.map((ref, i) =>
                              i === index ? { ...ref, identifier: e.target.value } : ref
                            )
                          }));
                        }}
                        placeholder={
                          reference.type === 'pubmed' ? 'PubMed ID (e.g., 12345678)' :
                          reference.type === 'doi' ? 'DOI (e.g., 10.1000/xyz123)' :
                          'Reference URL or identifier'
                        }
                        className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            references: prev.references.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-gray-400 hover:text-red-500 p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  {formData.references.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">
                        No references added yet. Click "Add Reference" to include scientific citations.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Protocol Description *
                </label>
                <textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#0065A7] focus:ring-[#0065A7]"
                  placeholder="Describe the protocol, its benefits, and any important notes..."
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0065A7] text-white px-6 py-3 rounded-lg hover:bg-[#005490] disabled:opacity-50 transition"
              >
                {loading ? 'Creating Protocol...' : 'Create Protocol'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
