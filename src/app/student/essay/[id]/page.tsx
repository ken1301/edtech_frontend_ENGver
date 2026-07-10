"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LucideCheckCircle, 
  LucideSend, 
  LucidePaperclip, 
  LucideLightbulb, 
  LucideListMinus,
  LucideUploadCloud,
  LucideFileText,
  LucideInfo
} from 'lucide-react';
import { aiClient } from '@/lib/api/aiClient';
import apiClient from '@/lib/apiClient';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

export default function LessonView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const [content, setContent] = useState("");
  
  const [progress, setProgress] = useState(0); 
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [exercise, setExercise] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  
  const [chatMessage, setChatMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: "Hello! I am your AI learning assistant. If you have questions or need hints for this essay exercise, send me a message here.",
      timestamp: new Date()
    }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setIsInitializing(true);
      try {
        // 1. Fetch exercise details
        const exRes = await apiClient.get(`/student/exercises/${resolvedParams.id}`);
        setExercise(exRes.data);
        
        // 2. Fetch student's submission for this exercise
        const subRes = await apiClient.get(`/student/exercises/${resolvedParams.id}/submission`);
        if (subRes.data) {
          setSubmission(subRes.data);
          setContent(subRes.data.content || "");
          setUploadedFileUrl(subRes.data.file_url || null);
          if (subRes.data.file_url) {
            const parts = subRes.data.file_url.split('/');
            setUploadedFileName(decodeURIComponent(parts[parts.length - 1]));
          }
          if (subRes.data.status === 'GRADED') {
            setProgress(100);
          } else if (subRes.data.status === 'SUBMITTED') {
            setProgress(80);
          }
        }

        // 3. Fetch AI tutor active session
        let res = await aiClient.getActiveSession(resolvedParams.id);
        if (!res || res.status === 'not_found' || !res.session_id) {
          res = await aiClient.startSession(resolvedParams.id);
        }
        if (res.session_id) {
          setSessionId(res.session_id);
        }
        if (res.problems && res.problems.length > 0) {
          setActiveProblemId(res.problems[0].problem_id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsInitializing(false);
      }
    };
    fetchData();
  }, [resolvedParams.id]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    if (!sessionId) {
      alert("The AI Tutor is still initializing this session. Please wait a moment or reload the page.");
      return;
    }
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMsg]);
    const userMsg = chatMessage;
    setChatMessage("");
    setIsTyping(true);
    
    try {
      const res = await aiClient.chat(sessionId, userMsg, false, activeProblemId || 1);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.reply || "I am not fully sure what you mean yet. Could you explain it more clearly?",
        timestamp: new Date()
      }]);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || "There was an error connecting to the AI Tutor.";
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'ai',
        text: errMsg,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/storage/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.url) {
        setUploadedFileUrl(res.data.url);
        setUploadedFileName(file.name);
      }
    } catch (err) {
      console.error(err);
      alert("File upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!content.trim() && !uploadedFileUrl) return;
    if (!sessionId) {
      alert("The AI Tutor is still initializing this session. Please wait or reload the page before submitting.");
      return;
    }
    setIsEvaluating(true);
    try {
      const res = await apiClient.post('/student/submissions', {
        exerciseId: resolvedParams.id,
        content: content || null,
        fileUrl: uploadedFileUrl || null
      });
      setSubmission(res.data);
      setProgress(80);

      // Trigger AI feedback (Grounding the submission)
      await aiClient.chat(sessionId, `[Student Submission]: ${content || ''} File: ${uploadedFileUrl || ''}`, true, activeProblemId || 1);
      
      // Close session to generate final mastery score
      if (sessionId) {
        await aiClient.closeSession(sessionId, resolvedParams.id);
      }

      // Redirect to report page for polling
      window.location.href = `/student/report/${resolvedParams.id}`;

    } catch (err) {
      console.error(err);
      alert("Submission failed.");
      setIsEvaluating(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[var(--color-surface)] relative">
      {isInitializing && (
        <div className="absolute inset-0 bg-[var(--color-surface)] z-[200] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Initializing AI Tutor...</h2>
          <p className="text-[var(--color-muted)] mt-2">Preparing your personalized learning session</p>
        </div>
      )}
      
      {/* Progress Bar Top */}
      <div className="w-full h-1.5 bg-[var(--color-outline-variant)] shrink-0">
        <div 
          className="h-full bg-brand rounded-r-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Exercises Canvas */}
        <section className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6 bg-[var(--color-surface-container-high)]">
          
          {/* Lesson Header */}
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-brand/10 text-[var(--color-primary)] text-xs font-bold rounded-full uppercase tracking-wider">Essay exercise</span>
              <span className="text-[var(--color-muted)] text-xs font-medium">• Graded activity</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[var(--color-text)] mb-2 tracking-tight">
              {exercise?.title || 'Loading exercise...'}
            </h1>
            <p className="text-[var(--color-muted)]">
              Write a detailed response or upload a supporting document below to submit your work to the teacher.
            </p>
          </div>
 
          {/* Exercise List */}
          <div className="max-w-3xl flex flex-col gap-6 pb-12">
            
            <div className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--color-outline-variant)] flex items-center justify-center text-sm font-bold text-[var(--color-muted)] shrink-0">
                  1
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-[var(--color-text)] mb-3">Prompt and task requirements</h3>
                  <div className="prose max-w-none text-[var(--color-text)] text-sm leading-relaxed mb-6 bg-[var(--color-surface-container-high)] p-4 rounded-xl border border-[var(--color-outline-variant)]">
                    {exercise?.description || 'Loading exercise content...'}
                  </div>

                  <h3 className="text-base font-bold text-[var(--color-text)] mb-2">Your response</h3>
                  
                  {submission?.status === 'GRADED' ? (
                    <div className="border border-[var(--color-outline-variant)] rounded-xl p-4 bg-[var(--color-surface-container-high)] text-[var(--color-text)] min-h-[200px] whitespace-pre-wrap text-sm mb-4">
                      {submission.content || "(No text content provided)"}
                    </div>
                  ) : (
                    <textarea 
                      className="w-full text-[var(--color-text)] outline-none border border-[var(--color-outline-variant)] rounded-xl p-4 text-sm leading-relaxed min-h-[250px] resize-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                      placeholder="Type your essay or written response here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    ></textarea>
                  )}

                  {/* Attachment Section */}
                  <div className="mt-4 p-4 border border-[var(--color-outline-variant)] rounded-xl bg-[var(--color-surface-container-high)]/50 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">Attachments</h4>
                    {uploadedFileUrl ? (
                      <div className="flex items-center justify-between p-2 bg-brand/10 border border-brand/30 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-brand font-medium">
                          <LucideFileText className="w-4 h-4 text-[var(--color-primary)]" />
                          <span className="truncate max-w-xs">{uploadedFileName}</span>
                        </div>
                        {submission?.status !== 'GRADED' && (
                          <button 
                            onClick={() => {
                              setUploadedFileUrl(null);
                              setUploadedFileName(null);
                            }}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Remove file
                          </button>
                        )}
                      </div>
                    ) : (
                      submission?.status !== 'GRADED' && (
                        <div className="relative">
                          <button 
                            disabled={isUploading}
                            className="px-4 py-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-outline-variant)] text-[var(--color-muted)] border border-[var(--color-outline-variant)] rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <LucideUploadCloud className="w-4 h-4 text-brand" />
                            {isUploading ? 'Uploading...' : 'Upload attachment (PDF/DOCX)'}
                          </button>
                          <input 
                            type="file" 
                            accept=".pdf,.docx,.doc" 
                            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                            onChange={handleFileUpload}
                            disabled={isUploading}
                          />
                        </div>
                      )
                    )}
                  </div>
                  
                  {submission?.status !== 'GRADED' && (
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-xs text-[var(--color-muted)]">
                        Your work will receive an AI pre-review before being forwarded to the teacher.
                      </span>
                      <button 
                        onClick={handleSubmitAnswer}
                        disabled={isEvaluating || (!content.trim() && !uploadedFileUrl)}
                        className="bg-[var(--color-primary)] text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:opacity-90 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {isEvaluating ? "Reviewing..." : "Submit response"}
                      </button>
                    </div>
                  )}

                  {/* Grading Result */}
                  {submission?.status === 'GRADED' && (
                    <div className="mt-6 p-5 bg-brand/10 border-2 border-brand/30 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-brand text-white font-extrabold px-5 py-2.5 rounded-bl-xl text-lg shadow-md">
                        {submission.grade} / 10
                      </div>
                      <h4 className="font-bold text-brand text-base mb-2">Teacher feedback:</h4>
                      <p className="text-[var(--color-muted)] text-sm font-medium leading-relaxed italic whitespace-pre-line">
                        "{submission.feedback || 'No additional feedback.'}"
                      </p>
                    </div>
                  )}

                  {submission?.status === 'SUBMITTED' && (
                    <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex gap-2.5 text-sm text-amber-300">
                      <LucideInfo className="w-5 h-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="font-bold">Submission successful!</p>
                        <p className="mt-0.5">Your response is waiting for the teacher's final grading. You can still ask the AI assistant for guidance on the right.</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </section>
        
        {/* Right Side: AI Chatbot Sidebar */}
        <aside className="w-[360px] border-l border-[var(--color-outline-variant)] bg-[var(--color-surface)] flex flex-col shrink-0 hidden lg:flex shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
          
          {/* Chat Header */}
          <div className="h-16 px-4 border-b border-[var(--color-outline-variant)] flex items-center gap-4 shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
              <span className="text-[var(--color-primary)] text-xl">🤖</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] leading-tight">Edu AI Assistant</h3>
              <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
              </p>
            </div>
          </div>

          {/* Chat History Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[var(--color-surface)]">
            
            <div className="self-center bg-[var(--color-outline-variant)] px-3 py-1 rounded-full text-xs font-bold text-[var(--color-muted)] mb-2">
              Today
            </div>

            {messages.map((msg) => {
              const isAI = msg.sender === 'ai';
              return (
                <div key={msg.id} className={`flex items-${isAI ? 'start' : 'end'} gap-2 max-w-[90%] ${isAI ? '' : 'self-end flex-row-reverse'}`}>
                  <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ${isAI ? 'bg-brand/10 mt-1' : 'border border-[var(--color-outline-variant)] overflow-hidden mb-1 bg-[var(--color-outline-variant)]'}`}>
                    {isAI ? <span className="text-[var(--color-primary)] text-xs font-bold">🤖</span> : <span className="text-[10px] text-white">Me</span>}
                  </div>
                  <div className={`${isAI ? 'bg-[var(--color-surface)] border-[var(--color-outline-variant)] text-[var(--color-text)] rounded-tl-none' : 'bg-[var(--color-primary)] text-white rounded-tr-none border-transparent'} px-4 py-3 rounded-2xl border shadow-sm text-sm leading-relaxed whitespace-pre-wrap`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            
            {isTyping && (
              <div className="flex items-start gap-2 max-w-[90%]">
                <div className="w-6 h-6 rounded-full bg-brand/10 shrink-0 flex items-center justify-center mt-1">
                  <span className="text-[var(--color-primary)] text-xs">🤖</span>
                </div>
                <div className="bg-[var(--color-surface)] px-4 py-3 rounded-2xl rounded-tl-none border border-[var(--color-outline-variant)] shadow-sm text-[var(--color-text)] flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}

          </div>

          {/* Chat Input Area */}
          <div className="p-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface)] shrink-0">
            <div className="relative flex items-end bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl focus-within:ring-2 focus-within:ring-[var(--color-primary)] transition-all p-1 pl-2 shadow-sm">
              <textarea 
                className="flex-1 max-h-[120px] min-h-[44px] bg-transparent border-none focus:ring-0 resize-none text-sm text-[var(--color-text)] py-2 outline-none disabled:opacity-50" 
                placeholder={sessionId ? "Ask the assistant..." : "Initializing AI assistant..."} 
                rows={1}
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!sessionId || isTyping}
              ></textarea>
              <div className="flex items-center gap-1 pb-1 pr-1">
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || isTyping || !sessionId}
                  className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-colors active:scale-95 flex items-center justify-center disabled:opacity-50">
                  <LucideSend className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="mt-3 flex justify-center gap-4 text-xs font-bold text-[var(--color-muted)]">
              <span className="flex items-center gap-1 cursor-pointer hover:text-[var(--color-text)] transition-colors">
                <LucideLightbulb className="w-4 h-4 text-amber-500" /> Get solving hints
              </span>
              <span className="flex items-center gap-1 cursor-pointer hover:text-[var(--color-text)] transition-colors">
                <LucideListMinus className="w-4 h-4 text-brand" /> Summarize key ideas
              </span>
            </div>
          </div>

        </aside>
      </main>
    </div>
  );
}
