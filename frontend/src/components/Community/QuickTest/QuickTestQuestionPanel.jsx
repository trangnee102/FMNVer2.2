import React, { useState, useEffect } from 'react';
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";

const QuickTestQuestionPanel = ({ question, progress, total, timeLeft, resultMode, onAnswer, answerFeedback, onNext }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");

  useEffect(() => {
    setSelectedOption(null);
    setTextAnswer("");
  }, [question]);

  const handleSelect = (opt) => {
    if (selectedOption || answerFeedback) return;
    setSelectedOption(opt);
    onAnswer(opt);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textAnswer.trim() || answerFeedback) return;
    handleSelect(textAnswer.trim());
  };

  const getOptionStyle = (opt) => {
    const isSelected = selectedOption === opt;
    const isCorrect = answerFeedback?.isCorrect;
    const isFeedbackActive = answerFeedback !== null;
    const isActuallyCorrectOption = answerFeedback && String(opt).trim().toLowerCase() === String(question.correctAnswer || question.correctAnswers || question.answer).trim().toLowerCase();

    let baseStyle = {
      padding: '20px 24px',
      borderRadius: '16px',
      border: '2px solid #e2e8f0',
      background: '#fff',
      cursor: isFeedbackActive ? 'default' : 'pointer',
      fontSize: '1.15rem',
      fontWeight: '600',
      color: '#334155',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden'
    };

    if (isSelected && !isFeedbackActive) {
      baseStyle.border = '2px solid #4f46e5';
      baseStyle.background = '#eef2ff';
      baseStyle.color = '#312e81';
      baseStyle.transform = 'scale(0.98)';
    }

    if (isFeedbackActive && resultMode === "SHOW_NOW") {
      if (isSelected) {
        if (isCorrect) {
          baseStyle.border = '2px solid #10b981';
          baseStyle.background = '#dcfce7';
          baseStyle.color = '#14532d';
        } else {
          baseStyle.border = '2px solid #ef4444';
          baseStyle.background = '#fee2e2';
          baseStyle.color = '#7f1d1d';
        }
      } else if (isActuallyCorrectOption) {
        baseStyle.border = '2px solid #10b981';
        baseStyle.background = '#dcfce7';
        baseStyle.color = '#14532d';
      } else {
        baseStyle.opacity = 0.5;
        baseStyle.border = '2px solid #f1f5f9';
      }
    }

    return baseStyle;
  };

  const getAlphabetLabel = (index) => {
    return String.fromCharCode(65 + index); 
  };

  const renderMath = (text) => {
    if (!text) return "";
    let processedText = text.replace(/\\\\/g, "\\");
    return <Latex>{processedText}</Latex>;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '30px' }}>
      <div style={{ background: '#fff', borderRadius: '24px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginBottom: '30px' }}>
        <h3 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 20px 0', lineHeight: '1.5', fontWeight: '800' }}>
          {renderMath(question.text)}
        </h3>
      </div>

      {question.options && question.options.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {question.options.map((opt, idx) => {
            const isActuallyCorrectOption = answerFeedback && String(opt).trim().toLowerCase() === String(question.correctAnswer || question.correctAnswers || question.answer).trim().toLowerCase();
            return (
              <div 
                key={idx} 
                style={getOptionStyle(opt)}
                onClick={() => handleSelect(opt)}
                onMouseEnter={(e) => {
                  if (!selectedOption && !answerFeedback) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedOption && !answerFeedback) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: selectedOption === opt ? (answerFeedback ? (answerFeedback.isCorrect ? '#10b981' : '#ef4444') : '#4f46e5') : (isActuallyCorrectOption ? '#10b981' : '#f1f5f9'), color: (selectedOption === opt || isActuallyCorrectOption) ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', flexShrink: 0 }}>
                  {getAlphabetLabel(idx)}
                </div>
                
                <span style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4' }}>
                  {renderMath(opt.replace(/^[A-D]\.\s*/i, ''))}
                </span>

                {answerFeedback && resultMode === "SHOW_NOW" && selectedOption === opt && (
                  <div style={{ position: 'absolute', right: '20px', fontSize: '1.5rem', opacity: 0.8 }}>
                    {answerFeedback.isCorrect ? '✅' : '❌'}
                  </div>
                )}
                {answerFeedback && resultMode === "SHOW_NOW" && selectedOption !== opt && isActuallyCorrectOption && (
                  <div style={{ position: 'absolute', right: '20px', fontSize: '1.5rem', opacity: 0.8 }}>
                    ✅
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <form onSubmit={handleTextSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: '#fff', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={answerFeedback !== null}
            placeholder="Nhập câu trả lời của bạn vào đây..."
            style={{
              width: '100%',
              maxWidth: '600px',
              padding: '18px 24px',
              borderRadius: '16px',
              border: answerFeedback ? (answerFeedback.isCorrect ? '2px solid #10b981' : '2px solid #ef4444') : '2px solid #cbd5e1',
              fontSize: '1.3rem',
              outline: 'none',
              textAlign: 'center',
              color: '#1e293b',
              background: answerFeedback ? (answerFeedback.isCorrect ? '#dcfce7' : '#fee2e2') : '#f8fafc',
              transition: 'all 0.3s ease'
            }}
            autoFocus
          />
          <button
            type="submit"
            disabled={!textAnswer.trim() || answerFeedback !== null}
            style={{
              padding: '14px 40px',
              background: (!textAnswer.trim() || answerFeedback) ? '#cbd5e1' : 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.2rem',
              fontWeight: '800',
              cursor: (!textAnswer.trim() || answerFeedback) ? 'not-allowed' : 'pointer',
              boxShadow: (!textAnswer.trim() || answerFeedback) ? 'none' : '0 6px 20px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            Gửi đáp án
          </button>
        </form>
      )}

      {answerFeedback && resultMode === "SHOW_NOW" && (
        <div style={{ marginTop: '30px', animation: 'fadeIn 0.4s ease-in-out' }}>
           <div style={{ textAlign: 'center', marginBottom: '20px' }}>
             {answerFeedback.isCorrect ? (
               <div style={{ display: 'inline-block', padding: '12px 30px', background: '#dcfce7', color: '#166534', borderRadius: '30px', fontWeight: '800', fontSize: '1.2rem', border: '1px solid #bbf7d0' }}>
                 Tuyệt vời! Chính xác +
               </div>
             ) : (
               <div style={{ display: 'inline-block', padding: '12px 30px', background: '#fee2e2', color: '#991b1b', borderRadius: '30px', fontWeight: '800', fontSize: '1.2rem', border: '1px solid #fecaca' }}>
                 Rất tiếc, câu trả lời chưa đúng
               </div>
             )}
           </div>

           {question.explanation && (
             <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '25px', marginBottom: '25px', textAlign: 'left' }}>
               <h4 style={{ color: '#0f172a', margin: '0 0 10px 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <i className="fa-solid fa-lightbulb" style={{ color: '#f59e0b', fontSize: '1.3rem' }}></i> Giải thích đáp án:
               </h4>
               <div style={{ color: '#334155', fontSize: '1.05rem', lineHeight: '1.6' }}>
                 {renderMath(question.explanation)}
               </div>
             </div>
           )}

           <div style={{ textAlign: 'center' }}>
             <button
               onClick={onNext}
               style={{
                 padding: '16px 45px',
                 background: '#4f46e5',
                 color: 'white',
                 border: 'none',
                 borderRadius: '14px',
                 fontSize: '1.2rem',
                 fontWeight: '800',
                 cursor: 'pointer',
                 boxShadow: '0 6px 20px rgba(79, 70, 229, 0.3)',
                 transition: 'all 0.2s ease',
                 display: 'inline-flex',
                 alignItems: 'center',
                 gap: '10px'
               }}
               onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
             >
               {progress < total ? "Câu tiếp theo" : "Hoàn thành"} <i className="fa-solid fa-arrow-right"></i>
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default QuickTestQuestionPanel;