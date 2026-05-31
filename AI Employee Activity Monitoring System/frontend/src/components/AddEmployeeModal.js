'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Image, Check, AlertTriangle, Scan } from 'lucide-react';

export default function AddEmployeeModal({ isOpen, onClose, onRegisterSuccess }) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('AI Research');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Camera state
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Start browser webcam stream
  const startCamera = async () => {
    setErrorMsg('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setUseCamera(true);
    } catch (err) {
      console.error('[Webcam register] Camera access error:', err);
      setErrorMsg('Webcam blocked or not available. Please upload a file instead.');
      setUseCamera(false);
    }
  };

  // Stop webcam stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  useEffect(() => {
    if (isOpen && useCamera) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [useCamera, isOpen]);

  // Capture snapshot from webcam video element
  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], `${name.replace(/\s+/g, '-')}_face.jpg`, { type: 'image/jpeg' });
      setImageFile(file);
      setImagePreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }, 'image/jpeg');
  };

  // Handle local file uploads
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit enrollment payload
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter employee name.');
      return;
    }
    if (!imageFile) {
      setErrorMsg('Please capture or upload a face image.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('department', department);
    formData.append('file', imageFile);

    try {
      const res = await fetch('http://localhost:8000/api/employees/register', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Enrollment failed.');
      }

      // Success
      setName('');
      setImageFile(null);
      setImagePreview(null);
      stopCamera();
      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error communicating with FastAPI server.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setName('');
    setImageFile(null);
    setImagePreview(null);
    setErrorMsg('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="glass-panel border-cyan-500/30 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl shadow-cyan-500/10">
        
        {/* Header */}
        <div className="p-4 bg-slate-950/60 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-orbitron font-bold text-sm tracking-wider uppercase text-cyan-400 flex items-center gap-1.5">
            <Scan className="w-4 h-4" /> Employee Bio-Enroller
          </h3>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-500/20 text-rose-300 text-[10px] font-mono rounded flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Name & Dept */}
          <div>
            <label className="block text-[10px] uppercase font-mono font-bold text-gray-400 mb-1">
              Staff Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aayush Sharma"
              className="w-full bg-slate-950 border border-white/10 rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono font-bold text-gray-400 mb-1">
              Assign Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded p-2 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-400 transition"
            >
              <option value="AI Research">AI Research</option>
              <option value="Product Design">Product Design</option>
              <option value="Operations">Operations</option>
              <option value="Security Management">Security Management</option>
            </select>
          </div>

          {/* Camera Capture or Upload Screen */}
          <div>
            <label className="block text-[10px] uppercase font-mono font-bold text-gray-400 mb-2">
              Biometric Capture
            </label>

            {useCamera ? (
              <div className="relative w-full aspect-video bg-black rounded border border-cyan-400/30 overflow-hidden flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
                
                {/* Simulated scan bounds */}
                <div className="absolute inset-4 border border-cyan-400/20 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border border-dashed border-cyan-400/60 rounded-full animate-ping" />
                  </div>
                </div>
                
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-black font-mono font-bold text-[10px] uppercase rounded tracking-wider flex items-center gap-1 shadow-lg"
                  >
                    <Camera className="w-3 h-3" /> Capture Face
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-1 bg-slate-900 border border-white/10 text-white font-mono font-bold text-[10px] uppercase rounded tracking-wider"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : imagePreview ? (
              <div className="relative w-full aspect-video bg-slate-950 rounded border border-white/10 overflow-hidden flex items-center justify-center">
                <img 
                  src={imagePreview} 
                  alt="Capture Preview" 
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setImageFile(null); }}
                  className="absolute top-2 right-2 p-1 bg-black/80 hover:bg-black rounded-full border border-white/10 text-rose-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUseCamera(true)}
                  className="p-6 bg-slate-950/60 hover:bg-slate-950 hover:border-cyan-400 border border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 group transition duration-200"
                >
                  <Camera className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-gray-400">Webcam Capture</span>
                </button>

                <label className="p-6 bg-slate-950/60 hover:bg-slate-950 hover:border-cyan-400 border border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 group transition duration-200 cursor-pointer">
                  <Image className="w-6 h-6 text-magenta-400 group-hover:scale-110 transition" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-gray-400">Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !imageFile || !name.trim()}
              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-40 disabled:pointer-events-none text-black font-orbitron font-bold text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-1"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin mr-1 inline-block" />
                  Syncing Biometrics...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Enroll Face
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
