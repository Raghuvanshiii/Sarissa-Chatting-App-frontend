'use client';

import React, { useState } from 'react';
import {
  X,
  BarChart2,
  Plus,
  Trash2,
  Send,
  Check,
  GripVertical,
  HelpCircle
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export interface PollVoter {
  userId: string;
  name?: string;
  username?: string;
  avatar?: string;
  votedAt?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: (string | PollVoter)[];
}

export interface PollData {
  _type: 'poll';
  id: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  createdBy: string;
  createdAt: string;
}

interface PollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPoll: (poll: PollData) => void;
}

export const PollModal: React.FC<PollModalProps> = ({
  isOpen,
  onClose,
  onSendPoll,
}) => {
  const { user } = useAuthStore();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 12) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const isValid = question.trim().length > 0 && validOptions.length >= 2;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isValid) return;

    const poll: PollData = {
      _type: 'poll',
      id: `poll_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      question: question.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text,
        votes: [],
      })),
      allowMultiple,
      createdBy: user?._id || 'user',
      createdAt: new Date().toISOString(),
    };

    onSendPoll(poll);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#FFF5F7] border border-[#F5BAC6] rounded-3xl shadow-[0_20px_60px_rgba(194,74,104,0.18)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-[#2D151D]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F5BAC6] flex items-center justify-between bg-[#FFEBF0]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FCE7EC] border border-[#F5BAC6] text-[#C24A68] flex items-center justify-center shadow-2xs">
              <BarChart2 className="w-4 h-4 rotate-90" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#2D151D]">
                Create a Poll
              </h2>
              <p className="text-xs text-[#7C5362]">
                Ask a question with multiple choices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FCE7EC] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Question input */}
          <div>
            <label className="block text-xs font-bold text-[#2D151D] mb-1.5">
              Question <span className="text-[#C24A68]">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]"
            />
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#2D151D]">
                Options <span className="text-[#7C5362] font-normal">(min 2)</span>
              </label>
              <span className="text-[12px] text-[#7C5362] font-medium">
                {validOptions.length} / {options.length} filled
              </span>
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <div className="flex items-center justify-center w-5 h-5 text-[#7C5362] select-none font-bold">
                    <span className="text-[12px] font-mono">{idx + 1}.</span>
                  </div>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-[#F5BAC6] focus:outline-none focus:ring-2 focus:ring-[#C24A68]/20 focus:border-[#C24A68] text-[#2D151D] placeholder:text-[#7C5362]"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 rounded-lg text-[#7C5362] hover:text-[#C24A68] hover:bg-[#FFEBF0] transition cursor-pointer"
                      title="Remove option"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 12 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-[#C24A68] hover:text-[#B83253] py-1 px-2.5 rounded-lg hover:bg-[#FCE7EC] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add option</span>
              </button>
            )}
          </div>

          {/* Toggle: Allow multiple answers */}
          <div className="pt-3 border-t border-[#F5BAC6] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#2D151D]">
                Allow multiple answers
              </p>
              <p className="text-[12px] text-[#7C5362]">
                Participants can select more than one option
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#FCE7EC] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C24A68]" />
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#F5BAC6] flex items-center justify-end gap-2 bg-[#FFEBF0]/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-[#7C5362] hover:text-[#2D151D] hover:bg-[#FCE7EC] border border-[#F5BAC6] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValid}
            onClick={() => handleSubmit()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#C24A68] hover:bg-[#B83253] text-white shadow-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Create Poll</span>
          </button>
        </div>
      </div>
    </div>
  );
};
