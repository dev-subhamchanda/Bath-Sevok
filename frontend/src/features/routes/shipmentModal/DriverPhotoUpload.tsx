import React, { useRef, useState } from "react";
import type { CompressedImageResult } from "../imageCompression";

interface DriverPhotoUploadProps {
  selectedImage: CompressedImageResult | null;
  isCompressing: boolean;
  imageError: string | null;
  onProcessFile: (file: File) => void;
  onGenerateSample: () => void;
  onRemoveImage: () => void;
}

export const DriverPhotoUpload: React.FC<DriverPhotoUploadProps> = ({
  selectedImage,
  isCompressing,
  imageError,
  onProcessFile,
  onGenerateSample,
  onRemoveImage
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onProcessFile(file);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[#f8fafc] border border-[#e5e8ee]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-bold text-[#003356] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[17px] text-[#27638c]">photo_camera</span>
          <span>Driver Photo <span className="text-rose-600 font-bold">*</span></span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#cfe4ff] text-[#001d34]">
            Required • Max 45 KB
          </span>
          <button
            type="button"
            onClick={onGenerateSample}
            disabled={isCompressing}
            className="text-[11px] text-[#005148] hover:text-[#003d36] font-bold flex items-center gap-1 cursor-pointer underline disabled:opacity-50"
            title="Generate verified driver photo <= 45 KB"
          >
            <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
            <span>Use Sample Driver Photo</span>
          </button>
        </div>
      </div>

      {/* Image Dropzone & Preview */}
      {!selectedImage ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
            isDragging ? "border-[#003356] bg-[#eff6ff]" : "border-[#c2c7cf] hover:border-[#174a73] bg-white"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#003356] flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
          </div>
          <div className="text-xs text-[#181c20]">
            <span className="font-bold text-[#003356]">Click to upload</span> or drag and drop driver photo
          </div>
          <p className="text-[10px] text-[#72777f]">
            JPG, PNG or WEBP (automatically compressed on client to &le; 45 KB)
          </p>
          {isCompressing && (
            <div className="flex items-center gap-2 text-xs text-[#003356] font-semibold mt-1">
              <span className="w-3.5 h-3.5 border-2 border-[#003356] border-t-transparent rounded-full animate-spin" />
              <span>Compressing driver photo to &le; 45 KB...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#cfe4ff] shadow-xs">
          <div className="flex items-center gap-3">
            <img
              src={selectedImage.dataUrl}
              alt="Driver Photo Preview"
              className="w-14 h-14 rounded-lg object-cover border-2 border-[#003356] shadow-xs shrink-0"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#003356] truncate max-w-[220px]">
                {selectedImage.file.name || "driver_photo.jpg"}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                  <span>{selectedImage.sizeKb} KB (&le; 45 KB)</span>
                </span>
                <span className="text-[10px] text-[#72777f]">
                  {selectedImage.width}×{selectedImage.height}px
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-[#003356] hover:underline font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                onRemoveImage();
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold px-2.5 py-1 rounded-lg cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {imageError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 animate-in fade-in">
          <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
          <span>{imageError}</span>
        </div>
      )}
    </div>
  );
};
