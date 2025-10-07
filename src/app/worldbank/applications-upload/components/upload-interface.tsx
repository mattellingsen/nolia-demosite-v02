"use client";

import { useState } from "react";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";

interface UploadInterfaceProps {
    mode: 'single' | 'bulk';
    onFilesUploaded: (files: FileList) => void;
}

export const UploadInterface = ({ mode, onFilesUploaded }: UploadInterfaceProps) => {
    const [uploadedFiles, setUploadedFiles] = useState<Array<{
        file: File;
        progress: number;
        failed: boolean;
    }>>([]);

    const handleFileDrop = (files: FileList) => {
        const newFiles = Array.from(files).map(file => ({
            file,
            progress: 0,
            failed: false
        }));

        setUploadedFiles(prev => [...prev, ...newFiles]);

        // Simulate upload progress
        newFiles.forEach((fileItem, index) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                setUploadedFiles(prev =>
                    prev.map((item, i) =>
                        item.file.name === fileItem.file.name
                            ? { ...item, progress: Math.min(progress, 100) }
                            : item
                    )
                );

                if (progress >= 100) {
                    clearInterval(interval);
                    // Trigger the callback when all files are uploaded
                    setTimeout(() => {
                        onFilesUploaded(files);
                    }, 500);
                }
            }, 200);
        });
    };

    const handleFileDelete = (fileName: string) => {
        setUploadedFiles(prev => prev.filter(item => item.file.name !== fileName));
    };

    const handleFileRetry = (fileName: string) => {
        setUploadedFiles(prev =>
            prev.map(item =>
                item.file.name === fileName
                    ? { ...item, failed: false, progress: 0 }
                    : item
            )
        );
        // Restart upload simulation
        const fileItem = uploadedFiles.find(item => item.file.name === fileName);
        if (fileItem) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                setUploadedFiles(prev =>
                    prev.map(item =>
                        item.file.name === fileName
                            ? { ...item, progress: Math.min(progress, 100) }
                            : item
                    )
                );

                if (progress >= 100) {
                    clearInterval(interval);
                }
            }, 200);
        }
    };

    const getFileType = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return 'pdf';
            case 'doc':
            case 'docx':
                return 'doc';
            default:
                return 'empty';
        }
    };

    return (
        <div className="flex justify-center">
            <div className="w-full max-w-2xl">
                <FileUpload.Root>
                    <FileUpload.DropZone
                        hint="PDF or Word documents up to 50MB each"
                        accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                        allowsMultiple={mode === 'bulk'}
                        maxSize={50 * 1024 * 1024} // 50MB
                        onDropFiles={handleFileDrop}
                        onDropUnacceptedFiles={(files) => {
                            // Handle unaccepted files silently or show user feedback
                        }}
                        onSizeLimitExceed={(files) => {
                            // Handle size limit exceeded silently or show user feedback
                        }}
                        className="!bg-white !border !border-brand-secondary-600 min-h-64 py-12 !flex !items-center !justify-center !rounded-lg upload-dropzone-shadow"
                    />

                    {uploadedFiles.length > 0 && (
                        <FileUpload.List>
                            {uploadedFiles.map((item, index) => (
                                <FileUpload.ListItemProgressBar
                                    key={`${item.file.name}-${index}`}
                                    name={item.file.name}
                                    size={item.file.size}
                                    progress={item.progress}
                                    failed={item.failed}
                                    type={getFileType(item.file.name) as any}
                                    onDelete={() => handleFileDelete(item.file.name)}
                                    onRetry={() => handleFileRetry(item.file.name)}
                                />
                            ))}
                        </FileUpload.List>
                    )}
                </FileUpload.Root>

                <style jsx global>{`
                    .upload-dropzone-shadow {
                        box-shadow: 0 0 0 8px #F2FAFC !important;
                    }
                `}</style>
            </div>
        </div>
    );
};