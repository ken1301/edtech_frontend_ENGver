'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  UploadStep,
  Question,
  UploadExerciseResponse,
  QuestionOption,
} from '@/lib/types/exercise.types';
import { 
  UploadCloud, 
  FileText, 
  X, 
  CheckCircle2,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';

// =====================================================================
// Upload Progress Indicator Component
// =====================================================================
function UploadProgress({ step }: { step: UploadStep }) {
  const steps = [
    { key: 'uploading', label: 'Uploading...', desc: 'Sending file to the server' },
    { key: 'parsing',   label: 'AI is analyzing...', desc: 'Extracting questions from the document' },
    { key: 'done',      label: 'Done!', desc: 'Questions are ready for review' },
  ];

  const currentIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="py-4 space-y-4">
      {steps.map((s, index) => {
        const isDone = index < currentIndex || step === 'done';
        const isActive = s.key === step;

        return (
          <div key={s.key} className="flex items-center gap-4">
            {/* Step Indicator */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
              ${isDone ? 'bg-green-500 text-white' : ''}
              ${isActive ? 'bg-brand text-white' : ''}
              ${!isDone && !isActive ? 'bg-[var(--color-outline-variant)] text-[var(--color-muted)]' : ''}
            `}>
              {isDone ? (
                <CheckCircle2 size={16} />
              ) : isActive ? (
                <div className="w-4 h-4 border-2 border-[var(--color-surface)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-xs font-bold">{index + 1}</span>
              )}
            </div>

            {/* Step Text */}
            <div>
              <p className={`text-sm font-semibold transition-colors ${isActive ? 'text-brand' : isDone ? 'text-green-700' : 'text-[var(--color-muted)]'}`}>
                {s.key === 'uploading' && isDone ? 'Uploaded successfully' : 
                 s.key === 'parsing' && isDone ? 'AI analysis completed' : 
                 s.label}
              </p>
              <p className="text-xs text-[var(--color-muted)]">{s.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// Auto-Resizing Textarea Component
// =====================================================================
function AutoResizeTextarea({ 
  value, 
  onChange, 
  className, 
  placeholder,
  rows = 1
}: { 
  value: string; 
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden whitespace-pre-wrap break-words focus:outline-none transition-all ${className}`}
    />
  );
}

// =====================================================================
// Question Edit Card Component
// =====================================================================
function QuestionCard({ 
  question, 
  index, 
  onChange 
}: { 
  question: Question; 
  index: number; 
  onChange: (updated: Question) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleTextChange = (text: string) => {
    onChange({ ...question, question_text: text });
  };

  const handleOptionChange = (label: QuestionOption['label'], text: string) => {
    const updatedOptions = question.options.map(opt =>
      opt.label === label ? { ...opt, text } : opt
    );
    onChange({ ...question, options: updatedOptions });
  };

  const handleCorrectAnswerChange = (label: 'A' | 'B' | 'C' | 'D') => {
    onChange({ ...question, correct_answer: label });
  };

  return (
    <div className="border border-[var(--color-outline-variant)] rounded-xl overflow-hidden bg-[var(--color-surface)]">
      {/* Card Header */}
      <button
        onClick={() => setIsExpanded(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--color-surface-container-high)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {index + 1}
          </span>
          <p className="text-sm font-medium text-[var(--color-muted)] whitespace-normal break-words">
            {question.question_text || 'Question content is missing...'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded">
            Answer: {question.correct_answer}
          </span>
          {isExpanded ? <ChevronUp size={16} className="text-[var(--color-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-muted)]" />}
        </div>
      </button>

      {/* Card Body */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-[var(--color-outline-variant)] pt-4 space-y-4">
          {/* Question Text */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1 block">Question content</label>
            <AutoResizeTextarea
              value={question.question_text}
              onChange={handleTextChange}
              className="border border-[var(--color-outline-variant)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:ring-2 focus:ring-brand/20 min-h-[60px] bg-[var(--color-surface)]"
              placeholder="Enter the question content..."
              rows={2}
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2 block">
              Options <span className="text-green-600 font-bold">(✔ = Correct answer)</span>
            </label>
            <div className="space-y-2">
              {question.options.map(opt => (
                <div key={opt.label} className={`flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all
                  ${question.correct_answer === opt.label ? 'border-green-400 bg-green-50' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)]'}`}>
                  {/* Radio Button */}
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={question.correct_answer === opt.label}
                    onChange={() => handleCorrectAnswerChange(opt.label)}
                    className="w-4 h-4 accent-green-500 cursor-pointer"
                  />
                  <span className={`text-sm font-bold w-5 shrink-0
                    ${question.correct_answer === opt.label ? 'text-green-600' : 'text-[var(--color-muted)]'}`}>
                    {opt.label}.
                  </span>
                  <AutoResizeTextarea
                    value={opt.text}
                    onChange={(val) => handleOptionChange(opt.label, val)}
                    className="flex-1 text-sm bg-transparent text-[var(--color-text)] py-1"
                    placeholder={`Option ${opt.label} content`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Main Page Component
// =====================================================================
export default function ExerciseUploadPage() {
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      alert('Only .pdf or .docx files are accepted.');
      return;
    }
    setSelectedFile(file);
    setUploadStep('idle');
    setQuestions([]);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Call real API and SSE
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploadStep('uploading');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // 1. Upload the file to the backend
      const response = await apiClient.post('/exercises/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const { jobId } = response.data;
      setExerciseId(jobId); // Use jobId as a temporary exerciseId for the MVP
      
      // 2. Open an SSE connection to track processing progress
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const eventSource = new EventSource(`${baseURL}/exercises/${jobId}/progress`, {
        withCredentials: true,
      });
      
      // Listen for the "progress" event type from NestJS
      eventSource.addEventListener('progress', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE Progress Update:', data);
          
          if (data.status === 'PROCESSING_AI') {
            setUploadStep('parsing');
          } else if (data.status === 'COMPLETED') {
            setUploadStep('done');
            
            // Data returned from Python through BullMQ is stored in data.result
            if (data.result && data.result.questions) {
              setQuestions(data.result.questions);
            } else {
              console.error('No questions found in the result:', data);
              alert('AI finished analyzing the file but no valid questions were found.');
            }
            
            eventSource.close();
          } else if (data.status === 'FAILED') {
            setUploadStep('error');
            alert(`File processing error: ${data.failReason}`);
            eventSource.close();
          }
        } catch (e) {
          console.error('Error while parsing SSE data:', e);
        }
      });
      
      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        // SSE reconnects automatically after network loss, so only close it when the server returns a confirmed error
      };
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('File upload failed. Please check the console.');
      setUploadStep('idle');
    }
  };

  // Call real POST /api/exercises
  const handleSave = async () => {
    if (!questions.length) return;
    try {
      const payload = {
        title: selectedFile?.name?.replace(/\.[^/.]+$/, "") || 'New exercise',
        description: 'Exercise automatically generated by AI from file: ' + (selectedFile?.name || ''),
        questions: questions.map(q => ({
          questionText: q.question_text,
          type: 'mcq',
          options: q.options.map(opt => ({
            label: opt.label,
            text: opt.text
          })),
          correctAnswer: q.correct_answer
        }))
      };
      await apiClient.post('/exercises', payload);
      alert('Exercise saved successfully!');
      setQuestions([]);
      setSelectedFile(null);
      setUploadStep('idle');
    } catch (error: any) {
      console.error('Save failed:', error);
      alert('Failed to save exercise: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleQuestionChange = (index: number, updated: Question) => {
    setQuestions(prev => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-bg min-h-screen space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Upload a new exercise</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">AI will automatically extract questions from your document file.</p>
      </div>

      {/* SECTION 1: File Upload */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-outline-variant)] p-6 space-y-4">
        <h2 className="font-semibold text-[var(--color-muted)]">1. Choose a document file</h2>

        {/* Dropzone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all
            ${isDragging ? 'border-brand bg-brand/10' : 'border-[var(--color-outline-variant)] hover:border-brand hover:bg-[var(--color-surface-container-high)]'}`}
        >
          <UploadCloud size={40} className={isDragging ? 'text-brand' : 'text-[var(--color-muted)]'} />
          <p className="text-sm font-medium text-[var(--color-muted)]">
            Drag and drop your file here, or <span className="text-brand font-semibold">click to choose a file</span>
          </p>
          <p className="text-xs text-[var(--color-muted)]">Accepted: .docx, .pdf</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {/* Selected File Preview */}
        {selectedFile && uploadStep === 'idle' && (
          <div className="flex items-center justify-between px-4 py-3 bg-brand/10 rounded-lg border border-brand/30">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-brand" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">{selectedFile.name}</p>
                <p className="text-xs text-[var(--color-muted)]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                className="text-[var(--color-muted)] hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && uploadStep === 'idle' && (
          <button
            onClick={handleUpload}
            className="w-full py-3 bg-brand hover:opacity-90 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Start AI analysis
          </button>
        )}

        {/* Progress */}
        {['uploading', 'parsing', 'done'].includes(uploadStep) && (
          <div className="border-t border-[var(--color-outline-variant)] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-3">Processing progress</h3>
            <UploadProgress step={uploadStep} />
          </div>
        )}
      </div>

      {/* SECTION 2: Question Review & Edit */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[var(--color-muted)]">2. Review and edit questions</h2>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                AI extracted <span className="font-bold text-brand">{questions.length}</span> questions.
                Select the radio button to set the correct answer.
              </p>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              <Save size={16} /> Confirm and save
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, index) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={index}
                onChange={updated => handleQuestionChange(index, updated)}
              />
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              <Save size={16} /> Confirm and save all ({questions.length} questions)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
