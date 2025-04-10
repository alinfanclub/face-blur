import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import './appDesign.css';

function App() {
  const [images, setImages] = useState([]);  // images 상태는 이미지 업로드에 사용
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [format, setFormat] = useState('.png');
  const [blurRadiusMultiplier, setBlurRadiusMultiplier] = useState(1.0);
  const [blurStrength, setBlurStrength] = useState(24);
  const [minConfidence, setMinConfidence] = useState(0.1);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);  // 현재 선택된 이미지 인덱스 상태 추가
  const [processedImages, setProcessedImages] = useState([]);  // 처리된 이미지들 상태
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
  }, []);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setImages(files);
    setStatus(`📸 선택된 이미지 ${files.length}장`);
    setProgress(0);
    setProcessing(true);

    const newProcessedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
            newProcessedImages.push({
              buffer: reader.result,
              originalName: file.name,
              extension: format,
              url: URL.createObjectURL(blob), // Blob URL 생성
            });
            setProgress(Math.round(((i + 1) / files.length) * 100));
            resolve();
          };
          reader.readAsArrayBuffer(blob);
        }, format === '.jpeg' ? 'image/jpeg' : 'image/png');
      });
    }

    setProcessedImages(newProcessedImages); 
    // inptu file 초기화
    fileInputRef.current.value = null;  // input file 초기화
    // 새로운 배열을 갤러리에 반영
    setProcessing(false);
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
  const handleSave = async (image) => {
    try {
      console.log('[APP] 이미지 저장 요청:', image);
      const savedPaths = await window.myPreload.sendImages([image]);  // 비동기적으로 경로 받기
      console.log('이미지가 저장되었습니다! 경로:', savedPaths);
      setStatus(`✅ 저장 완료! 폴더: ${savedPaths.join(', ')}`);
    } catch (error) {
      console.error('저장 실패:', error);
      setStatus('❌ 저장 실패');
    }
  };
  
  const handleSaveAll = async () => {
    try {
      console.log('[APP] 모든 이미지 저장 요청');
      const savedPaths = await window.myPreload.sendImages(processedImages);  // 비동기적으로 경로 받기
      console.log('모든 이미지가 저장되었습니다! 경로:', savedPaths);
      setStatus(`✅ 모든 이미지 저장 완료! 폴더: ${savedPaths.join(', ')}`);
      // 2초후에 input file 초기화
    } catch (error) {
      console.error('모든 이미지 저장 실패:', error);
      setStatus('❌ 모든 이미지 저장 실패');
    }
  };
  
  const moveSlide = (direction) => {
    if (selectedImageIndex === null) return;
    const newIndex = selectedImageIndex + direction;
    if (newIndex >= 0 && newIndex < processedImages.length) {
      setSelectedImageIndex(newIndex);
    }
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

        <p className="status">{status}</p>
        {processing && <p className="status">📊 진행률: {progress}%</p>}

        {/* 미리보기 영역 */}
        <div className="preview-gallery">
          {processedImages.map((image, index) => (
            <div
              key={index}
              className="preview-item"
              onClick={() => setSelectedImageIndex(index)} // 클릭 시 슬라이드로 보기
            >
              <img
                src={image.url} // 블러 처리된 이미지를 표시
                alt={`Preview ${index}`}
                className="preview-image"
              />
            </div>
          ))}
        </div>

        {/* "모두 저장" 버튼 */}
        <button
          onClick={handleSaveAll}
          disabled={processedImages.length === 0 || loading || processing}
          className="button"
        >
          모두 저장
        </button>

        {/* 라이트박스 슬라이드 */}
        {selectedImageIndex !== null && (
          <div className="lightbox">
            <span className="close" onClick={() => setSelectedImageIndex(null)}>
              &times;
            </span>
            
            {/* 슬라이드 버튼 (이전) */}
            <div className="lightbox-content">
              <button
                className="slide-button"
                onClick={() => moveSlide(-1)}  // 이전 이미지
                disabled={selectedImageIndex === 0}
              >
                &lt;
              </button>

              {/* 현재 선택된 이미지 */}
              <img
                src={processedImages[selectedImageIndex]?.url}
                alt={`Full view ${selectedImageIndex}`}
                className="lightbox-image"
              />

              {/* 슬라이드 버튼 (다음) */}
              <button
                className="slide-button"
                onClick={() => moveSlide(1)}  // 다음 이미지
                disabled={selectedImageIndex === processedImages.length - 1}
              >
                &gt;
              </button>
            </div>
            <div className="lightbox-buttons">
              <button onClick={() => handleSave(processedImages[selectedImageIndex])}>
                이 사진만 저장하기
              </button>
              <button onClick={handleSaveAll}>모두 저장하기</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
