import React, { useState, useMemo } from 'react';
import { EssayQuestion, EssayGradingResult, Difficulty } from '../types/history';
import { SAMPLE_ESSAYS } from '../data/sampleQuestions';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Award,
  FileText,
  Search,
  Filter,
  Flame,
  ListChecks,
  ChevronRight,
  RotateCcw,
  X,
  Target,
} from 'lucide-react';

interface EssayViewProps {
  onSaveEssayAttempt: (data: {
    topic: string;
    question: string;
    score: number;
    feedback: string;
    missingPoints: string[];
    recommendedReview: string;
  }) => void;
}

export const EssayView: React.FC<EssayViewProps> = ({ onSaveEssayAttempt }) => {
  const [questions, setQuestions] = useState<EssayQuestion[]>(SAMPLE_ESSAYS);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [studentAnswer, setStudentAnswer] = useState<string>('');
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [isGeneratingNew, setIsGeneratingNew] = useState<boolean>(false);
  const [gradingResult, setGradingResult] = useState<EssayGradingResult | null>(null);
  const [showSuggestedAnswer, setShowSuggestedAnswer] = useState<boolean>(false);
  const [showKeyOutline, setShowKeyOutline] = useState<boolean>(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const currentQ = questions[selectedIdx] || SAMPLE_ESSAYS[0];
  const wordCount = studentAnswer.trim() ? studentAnswer.trim().split(/\s+/).length : 0;

  // Categories list
  const categories = [
    { id: 'all', label: 'Tất cả chuyên đề' },
    { id: 'chong-phap', label: 'Kháng chiến chống Pháp (1945–1954)', filterKey: 'Pháp' },
    { id: 'chong-my', label: 'Kháng chiến chống Mỹ (1954–1975)', filterKey: 'Mỹ' },
    { id: 'cach-mang', label: 'Phong trào CM & Đảng (1930–1945)', filterKey: '1930' },
    { id: 'doi-moi-qt', label: 'Đổi mới & Quan hệ quốc tế', filterKey: 'Đổi mới' },
  ];

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const catObj = categories.find((c) => c.id === selectedCategory);
        if (catObj && catObj.filterKey) {
          if (catObj.id === 'cach-mang') {
            const isMatch = q.topic.includes('1930') || q.topic.includes('1945') || q.topic.includes('tháng Tám');
            if (!isMatch) return false;
          } else if (catObj.id === 'doi-moi-qt') {
            const isMatch = q.topic.includes('Đổi mới') || q.topic.includes('thế giới') || q.topic.includes('quốc tế');
            if (!isMatch) return false;
          } else if (!q.topic.includes(catObj.filterKey)) {
            return false;
          }
        }
      }

      // Difficulty filter
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const qLower = searchQuery.toLowerCase();
        const inQuestion = q.question.toLowerCase().includes(qLower);
        const inTopic = q.topic.toLowerCase().includes(qLower);
        const inKeyPoints = q.keyPoints.some((kp) => kp.toLowerCase().includes(qLower));
        if (!inQuestion && !inTopic && !inKeyPoints) return false;
      }

      return true;
    });
  }, [questions, selectedCategory, selectedDifficulty, searchQuery]);

  // AI Grade Essay
  const handleGradeEssay = async () => {
    if (!studentAnswer.trim()) {
      alert('Vui lòng nhập bài làm của bạn trước khi nộp chấm điểm!');
      return;
    }

    setIsGrading(true);
    try {
      const res = await fetch('/api/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          studentAnswer,
          suggestedAnswer: currentQ.suggestedAnswer,
          keyPoints: currentQ.keyPoints,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setGradingResult(data.result);
        onSaveEssayAttempt({
          topic: currentQ.topic,
          question: currentQ.question,
          score: data.result.score,
          feedback: data.result.generalFeedback,
          missingPoints: data.result.missingOrIncorrect || [],
          recommendedReview: data.result.recommendedReview || currentQ.topic,
        });
      } else {
        alert(data.error || 'Có lỗi khi chấm bài. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ AI chấm điểm.');
    } finally {
      setIsGrading(false);
    }
  };

  // Generate new essay question with AI
  const handleGenerateNewQuestion = async () => {
    setIsGeneratingNew(true);
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: currentQ.topic,
          questionType: 'essay',
          difficulty: 'hard',
          count: 1,
        }),
      });

      const data = await res.json();
      if (data.success && data.questions && data.questions.length > 0) {
        const newQ: EssayQuestion = data.questions[0];
        setQuestions((prev) => [newQ, ...prev]);
        setSelectedIdx(0);
        setStudentAnswer('');
        setGradingResult(null);
        setShowSuggestedAnswer(false);
        setShowKeyOutline(false);
      } else {
        alert(data.error || 'Không thể tạo đề tự luận lúc này.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Lỗi kết nối khi tạo câu hỏi tự luận.');
    } finally {
      setIsGeneratingNew(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro banner */}
      <div className="bg-gradient-to-r from-red-900 via-amber-900 to-stone-900 text-white p-5 sm:p-7 rounded-2xl shadow-md border border-red-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Tuyển tập câu hỏi tự luận & Chấm điểm thông minh</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-serif tracking-tight">
              Luyện viết Tự luận Lịch sử THPT (2025–2027)
            </h1>
            <p className="text-xs sm:text-sm text-amber-100/90 mt-1 max-w-2xl leading-relaxed">
              Chọn từ bộ sưu tập <strong>{questions.length} đề thi tự luận chuẩn cấu trúc Bộ GD&ĐT</strong>, rèn luyện kỹ năng
              phân tích, so sánh, chứng minh. Trợ lý AI Thầy Dũng sẽ chấm điểm chi tiết và chỉ ra luận điểm cần bổ sung.
            </p>
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={handleGenerateNewQuestion}
              disabled={isGeneratingNew}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-stone-950 font-black text-xs sm:text-sm transition-all shadow-md shadow-amber-950/30 disabled:opacity-50 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-stone-950 fill-stone-950" />
              <span>{isGeneratingNew ? 'AI đang tạo đề...' : 'AI ra đề mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Catalog & Filter Section */}
      <div className="bg-white rounded-2xl border border-amber-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Header & Quick Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 text-white shadow-2xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-stone-900 font-serif">
                Tuyển tập đề thi tự luận chọn lọc ({filteredQuestions.length}/{questions.length} đề)
              </h2>
              <p className="text-xs text-stone-500">
                Nhấp vào đề bài bất kỳ bên dưới để nạp đề vào khung làm bài
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo sự kiện, từ khóa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-stone-50/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all shrink-0 whitespace-nowrap shadow-2xs ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-red-700 border border-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-stone-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            Mức độ:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'medium', label: 'Thông hiểu 🟡' },
            { id: 'hard', label: 'Vận dụng cao 🔴' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDifficulty(d.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedDifficulty === d.id
                  ? 'bg-stone-900 text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 bg-stone-50'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Question Cards Grid */}
        {filteredQuestions.length === 0 ? (
          <div className="py-8 text-center text-stone-500 text-xs">
            Không tìm thấy đề tự luận phù hợp với bộ lọc hiện tại. Hãy thử tìm từ khóa khác nhé.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {filteredQuestions.map((q) => {
              const originalIndex = questions.findIndex((item) => item.id === q.id);
              const isSelected = selectedIdx === originalIndex;

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    setSelectedIdx(originalIndex);
                    setStudentAnswer('');
                    setGradingResult(null);
                    setShowSuggestedAnswer(false);
                    setShowKeyOutline(false);
                  }}
                  className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'border-red-500 bg-gradient-to-br from-red-50/90 via-amber-50/50 to-white shadow-md ring-2 ring-red-400/30'
                      : 'border-stone-200 hover:border-amber-400 bg-white hover:bg-stone-50/60 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-200">
                        {q.topic}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.difficulty === 'hard'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {q.difficulty === 'hard' ? 'Vận dụng cao' : 'Thông hiểu'}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-[13px] font-bold text-stone-900 line-clamp-3 leading-snug">
                      {q.question}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px] text-stone-500">
                    <span className="flex items-center gap-1 font-medium text-amber-900">
                      <ListChecks className="w-3.5 h-3.5 text-amber-600" />
                      {q.keyPoints.length} luận điểm then chốt
                    </span>

                    <span className={`font-bold flex items-center gap-0.5 ${isSelected ? 'text-red-700' : 'text-stone-400'}`}>
                      {isSelected ? 'Đang chọn' : 'Luyện đề này'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Question Display & Writing Area */}
      <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-md p-5 sm:p-7 space-y-4">
        {/* Top Header of Selected Question */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs">
              Đề thi số {(selectedIdx + 1).toString().padStart(2, '0')}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
              {currentQ.topic}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-800 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
              Thang điểm 10
            </span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {currentQ.keyPoints.length} luận điểm
            </span>
          </div>
        </div>

        {/* Question Title */}
        <h2 className="text-base sm:text-lg font-black text-stone-900 leading-relaxed font-serif">
          {currentQ.question}
        </h2>

        {/* Guide note if any */}
        {currentQ.guideNote && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-xs text-amber-950 shadow-2xs">
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-red-950">Gợi ý phương pháp làm bài:</strong> {currentQ.guideNote}
            </div>
          </div>
        )}

        {/* Toggleable Quick Key Points Outline (Gợi ý dàn ý sơ lược) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowKeyOutline(!showKeyOutline)}
            className="flex items-center gap-1.5 text-xs font-bold text-red-800 hover:text-red-950 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition-all"
          >
            <Target className="w-3.5 h-3.5 text-red-600" />
            <span>{showKeyOutline ? 'Đóng gợi ý dàn ý' : 'Xem gợi ý các luận điểm chính trước khi viết'}</span>
          </button>
        </div>

        {showKeyOutline && (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 space-y-2 text-xs text-stone-800">
            <div className="font-bold text-red-950 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-red-600" />
              <span>Dàn ý các luận điểm bắt buộc (Key Points checklist):</span>
            </div>
            <ul className="space-y-1.5 pl-1">
              {currentQ.keyPoints.map((kp, idx) => (
                <li key={idx} className="flex items-start gap-2 text-stone-800 leading-relaxed">
                  <span className="w-5 h-5 rounded-md bg-amber-200 text-amber-950 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{kp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Textarea for student answer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <label className="font-bold text-red-900 uppercase tracking-wider text-[11px]">
              Bài làm của bạn:
            </label>
            <span className="font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
              {wordCount} từ
            </span>
          </div>

          <textarea
            rows={9}
            placeholder="Nhập câu trả lời hoặc dàn ý phân tích lịch sử của bạn tại đây (ví dụ: Nêu bối cảnh lịch sử, diễn biến cốt lõi, ý nghĩa, bài học kinh nghiệm)..."
            value={studentAnswer}
            onChange={(e) => setStudentAnswer(e.target.value)}
            className="w-full text-xs sm:text-sm p-4 rounded-xl border border-stone-300 focus:outline-none focus:ring-4 focus:ring-red-500/15 focus:border-red-500 leading-relaxed text-stone-800 placeholder:text-stone-400 resize-y bg-stone-50/40 focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowSuggestedAnswer(!showSuggestedAnswer)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-bold transition-all shadow-2xs"
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>{showSuggestedAnswer ? 'Ẩn đáp án mẫu' : 'Xem đáp án mẫu chuẩn SGK'}</span>
          </button>

          <button
            type="button"
            onClick={handleGradeEssay}
            disabled={isGrading || !studentAnswer.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-red-600/25 disabled:opacity-40 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-yellow-200" />
            <span>{isGrading ? 'AI đang chấm bài & phân tích...' : 'Nộp bài cho Trợ lý AI chấm'}</span>
          </button>
        </div>

        {/* Suggested answer panel */}
        {showSuggestedAnswer && (
          <div className="mt-6 p-5 rounded-2xl bg-amber-50/70 border border-amber-300 text-xs sm:text-sm text-stone-800 shadow-sm">
            <h4 className="font-extrabold text-amber-950 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Đáp án mẫu chuẩn Lịch sử THPT:</span>
            </h4>
            <div className="whitespace-pre-line leading-relaxed text-stone-800 bg-white p-5 rounded-xl border border-amber-200 mb-3 shadow-2xs">
              {currentQ.suggestedAnswer}
            </div>

            <div className="text-xs text-stone-700 mt-3 pt-3 border-t border-amber-200/60">
              <strong className="text-red-950 font-bold block mb-1">Các luận điểm bắt buộc (Key points):</strong>
              <ul className="list-disc list-inside space-y-1">
                {currentQ.keyPoints.map((kp, i) => (
                  <li key={i}>{kp}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* AI Grading Result Panel */}
      {gradingResult && (
        <div className="bg-white rounded-2xl border-2 border-red-500/50 shadow-xl p-5 sm:p-7 space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-amber-100 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
                <Award className="w-4 h-4" />
                <span>Kết quả chấm điểm từ Trợ lý Lịch sử AI</span>
              </div>
              <h3 className="text-lg font-black text-stone-900 font-serif">
                Đánh giá bài làm tự luận
              </h3>
            </div>

            {/* Score Pill */}
            <div className="flex items-center gap-3">
              <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-tr from-red-700 via-red-600 to-amber-500 text-white text-center shadow-md shadow-red-900/25">
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-100">Điểm số</div>
                <div className="text-2xl font-black">{gradingResult.score} / 10</div>
              </div>
            </div>
          </div>

          {/* Teacher's general feedback */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs sm:text-sm text-stone-800 leading-relaxed shadow-2xs">
            <strong className="text-amber-950 block mb-1 font-bold">📝 Nhận xét của giáo viên:</strong>
            {gradingResult.generalFeedback}
          </div>

          {/* Strengths & Missing Points 2-col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Các luận điểm bạn đã đạt:</span>
              </div>
              <ul className="text-xs sm:text-sm space-y-1.5 text-emerald-950">
                {gradingResult.strengths?.length > 0 ? (
                  gradingResult.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-stone-500 italic">Chưa phát hiện luận điểm rõ ràng.</li>
                )}
              </ul>
            </div>

            {/* Missing or Inaccurate */}
            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Ý còn thiếu hoặc cần bổ sung:</span>
              </div>
              <ul className="text-xs sm:text-sm space-y-1.5 text-rose-950">
                {gradingResult.missingOrIncorrect?.length > 0 ? (
                  gradingResult.missingOrIncorrect.map((m, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>{m}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-emerald-700 italic font-semibold">Bài làm đã bao quát đầy đủ các ý chính!</li>
                )}
              </ul>
            </div>
          </div>

          {/* Recommended Review */}
          {gradingResult.recommendedReview && (
            <div className="p-4 rounded-xl bg-amber-100/60 border border-amber-300 text-xs sm:text-sm text-amber-950 flex items-start gap-2.5">
              <BookOpen className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-900 font-bold mb-0.5">
                  📚 Gợi ý bài học cần ôn lại:
                </strong>
                <span>{gradingResult.recommendedReview}</span>
              </div>
            </div>
          )}

          {/* Sample Solution */}
          {gradingResult.sampleSolution && (
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <strong className="block text-stone-900 text-xs sm:text-sm font-bold mb-2">
                ✨ Lời giải mẫu tối ưu chuẩn sư phạm để học hỏi:
              </strong>
              <div className="whitespace-pre-line text-xs sm:text-sm text-stone-700 leading-relaxed bg-white p-3.5 rounded-lg border border-stone-200 shadow-2xs">
                {gradingResult.sampleSolution}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

