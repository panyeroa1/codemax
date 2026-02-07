import React, { useEffect } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface MicrophoneInputProps {
    onTranscriptChange: (text: string) => void;
    className?: string;
}

export const MicrophoneInput: React.FC<MicrophoneInputProps> = ({ onTranscriptChange, className }) => {
    const { isListening, transcript, startListening, stopListening, hasRecognitionSupport, resetTranscript } = useSpeechRecognition();

    useEffect(() => {
        if (transcript) {
            onTranscriptChange(transcript);
        }
    }, [transcript, onTranscriptChange]);

    if (!hasRecognitionSupport) {
        return null; // Or render a disabled button with tooltip
    }

    const handleClick = () => {
        if (isListening) {
            stopListening();
        } else {
            resetTranscript();
            startListening();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`${className} ${isListening ? 'text-red-500 animate-pulse' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
            title={isListening ? "Stop recording" : "Start voice input"}
            aria-label={isListening ? "Stop recording" : "Start voice input"}
        >
            {isListening ? (
                <StopIcon className="w-5 h-5" />
            ) : (
                <MicrophoneIcon className="w-5 h-5" />
            )}
        </button>
    );
};
