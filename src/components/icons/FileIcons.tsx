import React from 'react';

interface FileIconProps {
  width?: number;
  height?: number;
  className?: string;
}

export const FileDocIcon: React.FC<FileIconProps> = ({ width = 40, height = 40, className }) => (
  <svg width={width} height={height} fill="none" viewBox="0 0 40 40" className={className}>
    <path
      stroke="#D5D7DA"
      strokeWidth={1.5}
      d="M7.75 4A3.25 3.25 0 0 1 11 .75h16c.121 0 .238.048.323.134l10.793 10.793a.46.46 0 0 1 .134.323v24A3.25 3.25 0 0 1 35 39.25H11A3.25 3.25 0 0 1 7.75 36z"
    />
    <path stroke="#D5D7DA" strokeWidth={1.5} d="M27 .5V8a4 4 0 0 0 4 4h7.5" />
    <rect width={36} height={16} x={1} y={18} fill="#155EEF" rx={2} />
    <path
      fill="#fff"
      d="M7.406 30H4.827v-7.273h2.6q1.097 0 1.89.437.79.433 1.217 1.246.43.814.43 1.947 0 1.136-.43 1.953a2.95 2.95 0 0 1-1.225 1.253Q8.513 30 7.406 30m-1.04-1.317h.976q.682 0 1.147-.242.468-.244.703-.756.237-.516.238-1.328 0-.807-.238-1.318a1.54 1.54 0 0 0-.7-.753q-.465-.24-1.147-.241h-.98zm12.42-2.32q0 1.19-.451 2.025a3.13 3.13 0 0 1-1.222 1.275 3.45 3.45 0 0 1-1.732.436 3.44 3.44 0 0 1-1.74-.44 3.14 3.14 0 0 1-1.219-1.275q-.447-.834-.447-2.02 0-1.19.447-2.024a3.1 3.1 0 0 1 1.218-1.272 3.44 3.44 0 0 1 1.74-.44q.963 0 1.733.44.775.437 1.222 1.271.45.835.451 2.025m-1.559 0q0-.77-.23-1.3-.228-.529-.643-.802a1.73 1.73 0 0 0-.973-.273 1.73 1.73 0 0 0-.973.273q-.416.274-.647.803-.227.53-.227 1.3t.227 1.3q.231.529.647.802.414.273.973.273.556 0 .973-.273.415-.273.642-.803.231-.528.231-1.3m9.115-1.09h-1.555a1.5 1.5 0 0 0-.174-.536 1.4 1.4 0 0 0-.338-.405 1.5 1.5 0 0 0-.476-.255 1.8 1.8 0 0 0-.578-.09q-.566 0-.984.282-.42.276-.65.81-.23.528-.23 1.285 0 .777.23 1.306.234.53.653.8t.97.27q.308 0 .572-.082.266-.082.472-.238a1.4 1.4 0 0 0 .34-.387q.14-.228.193-.519l1.555.007q-.06.501-.302.966a2.9 2.9 0 0 1-.643.828 3 3 0 0 1-.958.575q-.555.21-1.254.21-.974 0-1.74-.44a3.13 3.13 0 0 1-1.207-1.276q-.44-.834-.44-2.02 0-1.19.447-2.024t1.214-1.272a3.4 3.4 0 0 1 1.726-.44q.632 0 1.172.177.543.179.962.519.42.337.682.827.267.49.341 1.122m2.388-2.546 1.467 2.479h.057l1.473-2.479h1.737l-2.22 3.637L33.514 30h-1.769l-1.491-2.482h-.057L28.705 30h-1.761l2.276-3.636-2.233-3.637z"
    />
  </svg>
);

// Placeholder for PDF icon - using a simple generic file icon for now
// You can replace this with the actual PDF icon SVG when you provide it
export const FilePdfIcon: React.FC<FileIconProps> = ({ width = 40, height = 40, className }) => (
  <svg width={width} height={height} fill="none" viewBox="0 0 40 40" className={className}>
    <path
      stroke="#D5D7DA"
      strokeWidth={1.5}
      d="M7.75 4A3.25 3.25 0 0 1 11 .75h16c.121 0 .238.048.323.134l10.793 10.793a.46.46 0 0 1 .134.323v24A3.25 3.25 0 0 1 35 39.25H11A3.25 3.25 0 0 1 7.75 36z"
    />
    <path stroke="#D5D7DA" strokeWidth={1.5} d="M27 .5V8a4 4 0 0 0 4 4h7.5" />
    <rect width={36} height={16} x={1} y={18} fill="#DC2626" rx={2} />
    <path
      fill="#fff"
      d="M10 24h2.5c1.5 0 2.5 1 2.5 2.5S14 29 12.5 29H11v2h-1v-7zm1 4h1.5c1 0 1.5-.5 1.5-1.5s-.5-1.5-1.5-1.5H11v3zm7-4h2.5c1.5 0 2.5 1 2.5 2.5s-1 2.5-2.5 2.5H19v2h-1v-7zm1 4h1.5c1 0 1.5-.5 1.5-1.5s-.5-1.5-1.5-1.5H19v3zm8-4h4v1h-3v2h2.5v1H28v3h-1v-7z"
    />
  </svg>
);

// Generic file icon as fallback
export const FileGenericIcon: React.FC<FileIconProps> = ({ width = 40, height = 40, className }) => (
  <svg width={width} height={height} fill="none" viewBox="0 0 40 40" className={className}>
    <path
      stroke="#D5D7DA"
      strokeWidth={1.5}
      d="M7.75 4A3.25 3.25 0 0 1 11 .75h16c.121 0 .238.048.323.134l10.793 10.793a.46.46 0 0 1 .134.323v24A3.25 3.25 0 0 1 35 39.25H11A3.25 3.25 0 0 1 7.75 36z"
    />
    <path stroke="#D5D7DA" strokeWidth={1.5} d="M27 .5V8a4 4 0 0 0 4 4h7.5" />
  </svg>
);

// Helper function to get the appropriate icon based on mime type
export const getFileIcon = (mimeType?: string): React.FC<FileIconProps> => {
  if (!mimeType) return FileGenericIcon;

  // Word documents
  if (mimeType.includes('wordprocessingml') ||
      mimeType.includes('msword') ||
      mimeType.includes('.doc')) {
    return FileDocIcon;
  }

  // PDF documents
  if (mimeType.includes('pdf')) {
    return FilePdfIcon;
  }

  // Default fallback
  return FileGenericIcon;
};