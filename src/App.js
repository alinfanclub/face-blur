// 📁 App.js
import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import './appDesign.css';

function App() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [format, setFormat] = useState('.png');
  const [blurRadiusMultiplier, setBlurRadiusMultiplier] = useState(1.0);
  const [blurStrength, setBlurStrength] = useState(24);
  const [minConfidence, setMinConfidence] = useState(0.1);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('./models/ssd_mobilenetv1');
        setLoading(false);
      } catch (err) {
        console.error('❌ 모델 로딩 실패', err);
        setStatus('❌ 모델 로딩 실패');
      }
    };

    loadModels();

    if (window.myPreload?.listenChannelMessage) {
      window.myPreload.listenChannelMessage((data) => {
        if (data.type === 'save-images-done') {
          setStatus(`✅ 저장 완료! 폴더: ${data.path}`);
          setImages([]);
          setProgress(0);
          setProcessing(false);
        }
      });
    }
  }, []);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setImages(files);
    setStatus(`📸 선택된 이미지 ${files.length}장`);
    setProgress(0);
  };

  const handleProcess = async () => {
    if (!images.length || loading) return;
    setStatus('🛠️ 이미지 처리 중...');
    setProcessing(true);

    const processedImages = [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const img = await loadImage(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const detections = await faceapi.detectAllFaces(
        img,
        new faceapi.SsdMobilenetv1Options({ minConfidence })
      );

      detections.forEach((det) => {
        const { x, y, width, height } = det.box;
        const radius = Math.max(width, height) * blurRadiusMultiplier;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.clip();
        ctx.filter = `blur(${blurStrength}px)`;
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      });

      await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            processedImages.push({
              buffer: reader.result,
              originalName: file.name,
              extension: format,
            });
            setProgress(Math.round(((i + 1) / images.length) * 100));
            resolve();
          };
          reader.readAsArrayBuffer(blob);
        }, format === '.jpeg' ? 'image/jpeg' : 'image/png');
      });
    }

    if (window.myPreload?.sendImages) {
      window.myPreload.sendImages(processedImages);
      setStatus('💾 저장 요청 전송됨...');
      fileInputRef.current.value = null;
    } else {
      setStatus('❌ 저장 실패 (ipcRenderer 사용 불가)');
      setProcessing(false);
    }
  };

  const loadImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
    });
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">📷 얼굴 블러 이미지 처리기</h1>
        {loading && <p className="loading">🔄 모델 로딩 중...</p>}

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          disabled={loading || processing}
          ref={fileInputRef}
          className="file-input"
        />

        <div className="form-group">
          <label>저장 확장자</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value=".png">PNG</option>
            <option value=".jpeg">JPEG</option>
          </select>
        </div>

        <div className="form-group">
          <label>🔘 블러 크기: {blurRadiusMultiplier.toFixed(1)}배</label>
          <input
            type="range"
            min="1"
            max="2"
            step="0.1"
            value={blurRadiusMultiplier}
            onChange={(e) => setBlurRadiusMultiplier(parseFloat(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label>🎚️ 블러 강도: {blurStrength}px</label>
          <input
            type="range"
            min="4"
            max="64"
            step="2"
            value={blurStrength}
            onChange={(e) => setBlurStrength(parseInt(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label>🤔 얼굴 인식 민감도(낮을수록 더 많이 인식): {minConfidence}</label>
          <input
            type="range"
            min="0.1"
            max="0.99"
            step="0.01"
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
          />
        </div>

        <button
          onClick={handleProcess}
          disabled={!images.length || loading || processing}
          className="button"
        >
          블러 처리 후 저장
        </button>

        <p className="status">{status}</p>
        {processing && <p className="status">📊 진행률: {progress}%</p>}
      </div>
    </div>
  );
}

export default App;