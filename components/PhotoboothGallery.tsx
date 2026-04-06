import React from "react";
import { cn } from "@/utils/cn";

interface PhotoboothGalleryProps {
    photos: string[];
    onClear: () => void;
    onDownload: (dataUrl: string, index: number) => void;
}

export default function PhotoboothGallery({ photos, onClear, onDownload }: PhotoboothGalleryProps) {
    if (photos.length === 0) return null;

    return (
        <div className="pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-3">
                <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest font-bold">
                    Local Memory Buffer ({photos.length})
                </p>
                <button
                    onClick={onClear}
                    className={cn(
                        "text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest font-mono font-bold transition-all",
                        "text-red-500 bg-red-500/10 hover:bg-red-500/20"
                    )}
                >
                    FORMAT DISK
                </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {photos.map((photo, i) => (
                    <div key={i} className={cn(
                        "relative group cursor-pointer aspect-square bg-black rounded-lg",
                        "overflow-hidden border border-white/10 hover:border-emerald-500/50 transition-all"
                    )}>
                        <img
                            src={photo}
                            alt={`Photo ${i + 1}`}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all group-hover:scale-110"
                        />
                        <button
                            onClick={() => onDownload(photo, i)}
                            className={cn(
                                "absolute inset-0 bg-black/60 flex items-center justify-center",
                                "text-white text-[10px] uppercase font-bold tracking-widest font-mono",
                                "opacity-0 group-hover:opacity-100 transition-all"
                            )}
                        >
                            💾 SAVE
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
