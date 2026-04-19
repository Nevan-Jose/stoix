import { useState, useEffect } from 'react';

export default function TypewriterText({ texts, onComplete, typingSpeed = 60, pauseBetween = 1200 }) {
  const [displayedLines, setDisplayedLines] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (currentLineIndex >= texts.length) {
      setTimeout(() => onComplete?.(), 1500);
      return;
    }

    const currentText = texts[currentLineIndex];

    if (currentCharIndex <= currentText.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => {
          const newLines = [...prev];
          newLines[currentLineIndex] = currentText.slice(0, currentCharIndex);
          return newLines;
        });
        setCurrentCharIndex(c => c + 1);
      }, typingSpeed);
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
      const timeout = setTimeout(() => {
        setCurrentLineIndex(i => i + 1);
        setCurrentCharIndex(0);
        setIsTyping(true);
      }, pauseBetween);
      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, currentCharIndex, texts, typingSpeed, pauseBetween, onComplete]);

  const isLastLine = currentLineIndex >= texts.length;
  const showCursor = !isLastLine;

  return (
    <div className="space-y-6">
      {displayedLines.map((line, idx) => (
        <p
          key={idx}
          className={`text-xl sm:text-2xl md:text-3xl font-mono text-glow leading-relaxed ${
            idx === currentLineIndex && showCursor ? 'cursor-blink' : ''
          }`}
        >
          {line}
        </p>
      ))}
    </div>
  );
}