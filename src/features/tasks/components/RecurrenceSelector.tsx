'use client';

import { useState } from 'react';
import { RecurrencePattern } from '@/lib/validation/schemas/task.schema';
import { getRecurrenceDescription } from '@/features/tasks/services/recurrence.service';

interface RecurrenceSelectorProps {
  value?: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern | null) => void;
}

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>(
    value?.type || 'daily'
  );
  const [interval, setInterval] = useState(value?.interval || 1);
  const [selectedDays, setSelectedDays] = useState<number[]>(value?.daysOfWeek || [1, 2, 3, 4, 5]);
  const [endType, setEndType] = useState<'never' | 'after'>(value?.endsNever ? 'never' : 'after');
  const [endAfter, setEndAfter] = useState(value?.endAfter || 10);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleSave = () => {
    const pattern: RecurrencePattern = {
      type: recurrenceType,
      interval,
      endsNever: endType === 'never',
      endAfter: endType === 'after' ? endAfter : undefined,
    };

    if (recurrenceType === 'weekly') {
      pattern.daysOfWeek = selectedDays;
    }

    onChange(pattern);
    setIsOpen(false);
  };

  const handleRemove = () => {
    onChange(null);
    setIsOpen(false);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const description = value ? getRecurrenceDescription(value) : 'No recurrence';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Recurrence</label>

      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
          {value ? (
            <span>
              🔁 {description}
            </span>
          ) : (
            <span className="text-gray-500">No recurrence</span>
          )}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200"
        >
          {value ? 'Edit' : 'Add'}
        </button>
      </div>

      {isOpen && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white shadow-sm">
          {/* Recurrence Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Repeat</label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setRecurrenceType(type)}
                  className={`px-3 py-2 rounded text-sm font-medium transition ${
                    recurrenceType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Interval</label>
            <input
              type="number"
              min="1"
              max="365"
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value, 10)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Days of Week (Weekly only) */}
          {recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Days</label>
              <div className="flex gap-1">
                {dayNames.map((day, index) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(index)}
                    className={`flex-1 py-2 text-xs font-medium rounded transition ${
                      selectedDays.includes(index)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End Condition */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ends</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="endType"
                  value="never"
                  checked={endType === 'never'}
                  onChange={(e) => setEndType(e.target.value as 'never' | 'after')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Never</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="endType"
                  value="after"
                  checked={endType === 'after'}
                  onChange={(e) => setEndType(e.target.value as 'never' | 'after')}
                  className="w-4 h-4"
                />
                <span className="text-sm">After</span>
                {endType === 'after' && (
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={endAfter}
                    onChange={(e) => setEndAfter(Math.max(1, parseInt(e.target.value, 10)))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                )}
                {endType === 'after' && <span className="text-sm">times</span>}
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md border border-gray-300"
            >
              Cancel
            </button>
            {value && (
              <button
                onClick={handleRemove}
                className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md border border-red-200"
              >
                Remove
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Save
            </button>
          </div>

          {/* Preview */}
          {recurrenceType && (
            <div className="mt-4 p-2 bg-blue-50 rounded text-sm text-blue-900">
              Preview: {getRecurrenceDescription({
                type: recurrenceType,
                interval,
                daysOfWeek: recurrenceType === 'weekly' ? selectedDays : undefined,
                endAfter: endType === 'after' ? endAfter : undefined,
                endsNever: endType === 'never',
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
