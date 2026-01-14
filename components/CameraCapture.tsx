'use client';

import React, { useState, useRef, useEffect } from 'react';

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(true);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startCamera = async () => {
        setIsStarting(true);
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setError("Não foi possível acessar a câmera. Verifique as permissões.");
        } finally {
            setIsStarting(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        onCapture(file);
                    }
                }, 'image/jpeg', 0.85);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center animate-fade-in">
            {isStarting && (
                <div className="flex flex-col items-center gap-4 text-white">
                    <svg className="w-12 h-12 animate-spin text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-xs font-black uppercase tracking-widest">Iniciando Câmera...</p>
                </div>
            )}

            {error ? (
                <div className="p-8 text-center text-white">
                    <svg className="mx-auto mb-4 text-red-500 w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="font-bold mb-8">{error}</p>
                    <button onClick={onClose} className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Fechar</button>
                </div>
            ) : (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Overlays */}
                    <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-10">
                        <button onClick={onClose} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/10">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>

                    <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center gap-12 z-10">
                        <button
                            onClick={capturePhoto}
                            className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                        >
                            <div className="w-20 h-20 bg-white rounded-full"></div>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CameraCapture;
